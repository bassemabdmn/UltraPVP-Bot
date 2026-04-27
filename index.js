const http = require('http');

http.createServer((req, res) => {
  res.write("Ultra PVP Bot is Online!");
  res.end();
}).listen(process.env.PORT || 8080);
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- الإعدادات ---
const TOKEN = process.env.TOKEN;
const SUGGESTION_CHANNEL_ID = '1496684435116920912'; 
// هنا تضع أرقام الرتب التي نسختها من إعدادات السيرفر
const ROLE_MAN = '1496716967891963944'; // مثال لرتبة رجل
const ROLE_WOMAN = '1496717004093259866'; // مثال لرتبة امرأة
const ROLE_PLUS18 = '1496717038998261861'; // مثال لرتبة +18
const ROLE_MINUS18 = '1496717068932743240'; // مثال لرتبة -18
const ROLE_DZ = '1496716783409954926'; // رتبة الجزائر
const ROLE_MA = '1496716866222293023'; // رتبة المغرب
const ROLE_TN = '1496716834068631563'; // رتبة تونس
const ROLE_ARAB = '1496716907649306804'; // رتبة عرب آخرين

// --- [2] قسم استقبال الأوامر (إرسال لوحة الرتب والاقتراحات) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setup-roles') {
        const embed = new EmbedBuilder()
            .setTitle('🎭 Self-Roles | Ultra PVP')
            .setDescription('إختر الرتب التي تناسبك من الأزرار أدناه:')
            .setColor('#FF0000');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_man').setLabel('Man 👨').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('role_woman').setLabel('Woman 👩').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_plus18').setLabel('+18').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('role_minus18').setLabel('-18').setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_dz').setLabel('Algeria 🇩🇿').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('role_ma').setLabel('Morocco 🇲🇦').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('role_tn').setLabel('Tunisia 🇹🇳').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('role_other').setLabel('Other Arabs 🌍').setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });
    }

    if (message.content === '!setup-suggest') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('drop_idea').setLabel('إرسال اقتراح 💡').setStyle(ButtonStyle.Success)
        );
        await message.channel.send({ content: '**إضغط على الزر لتقديم اقتراحك للسيرفر:**', components: [row] });
    }
});

// --- [3] قسم التفاعلات (الرتب + الاقتراحات + العداد) ---
client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton()) {
        
        // 1. منطق عداد التصويت (قبول / رفض)
        if (interaction.customId === 'vote_up' || interaction.customId === 'vote_down') {
            const embed = interaction.message.embeds[0];
            if (!embed) return;

            // استخراج الأرقام الحالية من الـ Footer
            let upVotes = parseInt(embed.footer?.text?.match(/قبول: (\d+)/)?.[1] || 0);
            let downVotes = parseInt(embed.footer?.text?.match(/رفض: (\d+)/)?.[1] || 0);

            if (interaction.customId === 'vote_up') upVotes++;
            if (interaction.customId === 'vote_down') downVotes++;

            const updatedEmbed = EmbedBuilder.from(embed)
                .setFooter({ text: `📊 إجمالي الأصوات | قبول: ${upVotes} — رفض: ${downVotes}` });

            // تحديث الرسالة فوراً بالعدد الجديد
            return await interaction.update({ embeds: [updatedEmbed] });
        }

        // 2. منطق الرتب الذاتية
        const rolesMap = {
            'role_man': ROLE_MAN, 'role_woman': ROLE_WOMAN,
            'role_plus18': ROLE_PLUS18, 'role_minus18': ROLE_MINUS18,
            'role_dz': ROLE_DZ, 'role_ma': ROLE_MA,
            'role_tn': ROLE_TN, 'role_other': ROLE_ARAB
        };

        if (rolesMap[interaction.customId]) {
            const rid = rolesMap[interaction.customId];
            const role = interaction.guild.roles.cache.get(rid);
            if (!role) return interaction.reply({ content: '❌ رتبة غير موجودة!', ephemeral: true });

            if (interaction.member.roles.cache.has(rid)) {
                await interaction.member.roles.remove(rid);
                return interaction.reply({ content: `✅ تم إزالة **${role.name}**`, ephemeral: true });
            } else {
                await interaction.member.roles.add(rid);
                return interaction.reply({ content: `✅ حصلت على **${role.name}**`, ephemeral: true });
            }
        }

        // 3. زر فتح نافذة الاقتراح
        if (interaction.customId === 'drop_idea') {
            const modal = new ModalBuilder().setCustomId('idea_modal').setTitle('Submit Idea');
            const input = new TextInputBuilder()
                .setCustomId('idea_text').setLabel("ما هو اقتراحك؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }
    }

    // استقبال بيانات الاقتراح وإرساله (مع تصفير العداد في البداية)
    if (interaction.isModalSubmit() && interaction.customId === 'idea_modal') {
        const idea = interaction.fields.getTextInputValue('idea_text');
        const channel = client.channels.cache.get(SUGGESTION_CHANNEL_ID);
        
        if (channel) {
            const suggestionEmbed = new EmbedBuilder()
                .setTitle('💡 New Suggestion')
                .addFields(
                    { name: 'User', value: `${interaction.user}`, inline: true },
                    { name: 'Status', value: '📊 Waiting for votes', inline: true },
                    { name: 'Suggestion', value: idea }
                )
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setColor('#FF0000')
                .setFooter({ text: `📊 إجمالي الأصوات | قبول: 0 — رفض: 0` }) // العداد يبدأ من صفر
                .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vote_up').setLabel('قبول').setEmoji('👍').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('vote_down').setLabel('رفض').setEmoji('👎').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [suggestionEmbed], components: [buttons] });
            return await interaction.reply({ content: '✅ تم إرسال اقتراحك بنجاح!', ephemeral: true });
        }
    }
});

client.login(TOKEN);