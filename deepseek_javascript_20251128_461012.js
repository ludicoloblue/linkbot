const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Discord Bot Online</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .status { color: #4CAF50; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="status">✅ Discord Reaction Role Bot is Online</div>
        <p>Bot is running successfully on Render</p>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const token = process.env.TOKEN;
const roleMessages = new Map();

if (!token) {
  console.error('No token found in environment variables');
  process.exit(1);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`✅ Bot is in ${client.guilds.cache.size} servers`);
  client.user.setActivity('!reactionroles', { type: 'WATCHING' });
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('!reactionroles')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ You need administrator permissions to use this command.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🎮 Reaction Roles')
      .setDescription('React to get roles!\n\n🎮 - Gamer\n🎨 - Artist\n💻 - Programmer\n🎵 - Musician')
      .setColor(0x5865F2)
      .setFooter({ text: 'Click reactions below to get roles' });

    try {
      const sentMessage = await message.channel.send({ embeds: [embed] });
      await sentMessage.react('🎮');
      await sentMessage.react('🎨');
      await sentMessage.react('💻');
      await sentMessage.react('🎵');

      roleMessages.set(sentMessage.id, {
        '🎮': 'Gamer',
        '🎨': 'Artist', 
        '💻': 'Programmer',
        '🎵': 'Musician'
      });

      await message.delete();
    } catch (error) {
      console.error('Error creating reaction roles:', error);
    }
  }

  if (message.content.startsWith('!reactionmenu')) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ You need administrator permissions to use this command.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🔧 Select Your Roles')
      .setDescription('Choose your roles from the dropdown menu below:')
      .setColor(0x5865F2);

    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('role_select')
          .setPlaceholder('Select your roles...')
          .setMinValues(0)
          .setMaxValues(4)
          .addOptions([
            {
              label: 'Gamer',
              description: 'Get the Gamer role',
              value: 'gamer_role',
              emoji: '🎮'
            },
            {
              label: 'Artist',
              description: 'Get the Artist role',
              value: 'artist_role',
              emoji: '🎨'
            },
            {
              label: 'Programmer',
              description: 'Get the Programmer role',
              value: 'programmer_role',
              emoji: '💻'
            },
            {
              label: 'Musician',
              description: 'Get the Musician role',
              value: 'musician_role',
              emoji: '🎵'
            }
          ])
      );

    try {
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.delete();
    } catch (error) {
      console.error('Error creating role menu:', error);
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const messageData = roleMessages.get(reaction.message.id);
  if (!messageData) return;

  const roleName = messageData[reaction.emoji.name];
  if (!roleName) return;

  const guild = reaction.message.guild;
  try {
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.find(r => r.name === roleName);

    if (role) {
      await member.roles.add(role);
      console.log(`✅ Added ${roleName} role to ${user.tag}`);
    }
  } catch (error) {
    console.error('Error adding role:', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  const messageData = roleMessages.get(reaction.message.id);
  if (!messageData) return;

  const roleName = messageData[reaction.emoji.name];
  if (!roleName) return;

  const guild = reaction.message.guild;
  try {
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.find(r => r.name === roleName);

    if (role) {
      await member.roles.remove(role);
      console.log(`❌ Removed ${roleName} role from ${user.tag}`);
    }
  } catch (error) {
    console.error('Error removing role:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === 'role_select') {
    const roleMap = {
      'gamer_role': 'Gamer',
      'artist_role': 'Artist',
      'programmer_role': 'Programmer',
      'musician_role': 'Musician'
    };

    try {
      const member = interaction.member;
      const selectedRoles = interaction.values;
      
      for (const [value, roleName] of Object.entries(roleMap)) {
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          if (selectedRoles.includes(value)) {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role);
            }
          } else {
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
            }
          }
        }
      }

      const roleList = selectedRoles.map(r => roleMap[r]).join(', ') || 'no roles';
      await interaction.reply({ 
        content: `✅ Updated your roles! You now have: ${roleList}`,
        ephemeral: true 
      });
    } catch (error) {
      console.error('Error handling role selection:', error);
      await interaction.reply({ 
        content: '❌ Error updating roles. Please try again.',
        ephemeral: true 
      });
    }
  }
});

client.login(token).catch(error => {
  console.error('Login error:', error);
  process.exit(1);
});