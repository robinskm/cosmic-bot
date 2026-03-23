require('dotenv').config();

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  demuxProbe,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} = require('@discordjs/voice');
const {
  AttachmentBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
} = require('discord.js');
const ffmpegPath = require('ffmpeg-static');
const youtubeDlExec = require('youtube-dl-exec');
const ytSearch = require('yt-search');
const ytpl = require('ytpl');

const prefix = '-';
const token = process.env.COSMIC_BOT_TOKEN;
const COOKIE = process.env.COOKIE;
const COOKIE_FILE = process.env.COOKIE_FILE || process.env.YT_DLP_COOKIE_FILE;
const YT_COOKIES = process.env.YT_COOKIES;
const YT_COOKIES_BASE64 = process.env.YT_COOKIES_BASE64;
const ownerId = '216336551519584257';
const fallbackThumbnail = 'https://cdn.iconscout.com/icon/free/png-256/youtube-85-226402.png';
const idleTimeoutMs = 5 * 60 * 1000;
const localYtDlpPath = path.join(__dirname, 'tools', 'yt-dlp');
const ytDlpPath = fs.existsSync(localYtDlpPath)
  ? localYtDlpPath
  : youtubeDlExec.constants.YOUTUBE_DL_PATH;
const youtubeDl = youtubeDlExec.create(ytDlpPath);
const resolvedCookieFile = initializeCookieFile();

if (!token) {
  throw new Error('COSMIC_BOT_TOKEN is required.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const queue = new Map();

client.once('clientReady', () => {
  console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥  ✨ is ready!');
  logCookieStatus();
});

client.on('shardReconnecting', () => {
  console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥  ✨ is reconnecting!');
});

client.on('voiceStateUpdate', (oldState, newState) => {
  try {
    if (!client.user || newState.id !== client.user.id) {
      return;
    }

    const leftVoiceChannel = oldState.channelId && !newState.channelId;
    if (!leftVoiceChannel) {
      return;
    }

    const serverQueue = queue.get(oldState.guild.id);
    if (!serverQueue) {
      return;
    }

    clearIdleTimeout(serverQueue);
    queue.delete(oldState.guild.id);
    console.log('Bot disconnected from voice, clearing the queue.');
  } catch (error) {
    console.log('Caught an error:', error);
  }
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot || !message.guild) {
      return;
    }

    if (!message.content.startsWith(prefix)) {
      return;
    }

    const serverQueue = queue.get(message.guild.id);
    const lowerContent = message.content.toLowerCase();

    if (lowerContent.startsWith(`${prefix}brownies`)) {
      await message.channel.send({ embeds: [makeEmbed('*d e c o s m i c \' d*', '#D09CFF')] });
      return;
    }

    if (lowerContent.startsWith(`${prefix}bread`)) {
      await message.channel.send({ embeds: [makeEmbed('check it 🫵🏼', '#D09CFF')] });
      return;
    }

    if (lowerContent.startsWith(`${prefix}guildmaster`)) {
      await sendImageEmbed(message, 'guildmaster.jpg', `*Guildmasther pleath, lawd have merthy  😩💦*`, '#FF908B');
      return;
    }

    if (lowerContent.startsWith(`${prefix}die`) || lowerContent.startsWith(`${prefix}kill`)) {
      await message.channel.send({ embeds: [makeEmbed('*No u* 👉🏼😎👉🏼', '#D09CFF')] });
      return;
    }

    if (lowerContent.startsWith(`${prefix}playlist `) || lowerContent.startsWith(`${prefix}pl `)) {
      await handlePlayCommand(message, { forcePlaylist: true });
      return;
    }

    if (lowerContent.startsWith(`${prefix}p `)) {
      await handlePlayCommand(message);
      return;
    }

    if (lowerContent === `${prefix}queue` || lowerContent === `${prefix}q`) {
      if (!serverQueue || serverQueue.songs.length === 0) {
        await message.channel.send({ embeds: [makeEmbed('*The queue is empty!*', '#D09CFF')] });
        return;
      }

      const queueEmbed = new EmbedBuilder()
        .setTitle('📌 Queue List')
        .setDescription(`${serverQueue.songs.map((song) => `◦ ${song.title}`).join('\n')}\n\n**Now Playing:**\n**${serverQueue.songs[0].title}**`)
        .setImage(serverQueue.songs[0].thumbnail || fallbackThumbnail)
        .setColor('#D09CFF');

      await message.channel.send({ embeds: [queueEmbed] });
      return;
    }

    if (lowerContent === `${prefix}skip` || lowerContent === `${prefix}next`) {
      if (!message.member.voice.channel) {
        await message.channel.send({ embeds: [makeEmbed('You have to be in a voice channel to skip!', '#D09CFF')] });
        return;
      }

      if (!serverQueue) {
        await message.channel.send({ embeds: [makeEmbed(`There wasn't a song I could skip!`, '#D09CFF')] });
        return;
      }

      if (serverQueue.songs.length > 1) {
        serverQueue.pendingStatusMessage = await message.channel.send({
          embeds: [makeEmbed('*loading up your song...*', '#D09CFF')],
        });
      }

      cleanupPlaybackProcess(serverQueue);
      serverQueue.player.stop(true);
      return;
    }

    if (lowerContent === `${prefix}stop`) {
      if (!message.member.voice.channel) {
        await message.channel.send({ embeds: [makeEmbed('You have to be in a voice channel to stop!', '#D09CFF')] });
        return;
      }

      if (!serverQueue) {
        await message.channel.send({ embeds: [makeEmbed(`There wasn't a song I could stop!`, '#D09CFF')] });
        return;
      }

      serverQueue.songs = [];
      clearIdleTimeout(serverQueue);
      cleanupPlaybackProcess(serverQueue);
      serverQueue.player.stop(true);
      await message.channel.send({ embeds: [makeEmbed('*Song stopped, queue cleared*', '#D09CFF')] });
      return;
    }

    if (lowerContent === `${prefix}clear`) {
      if (!message.member.voice.channel) {
        await message.channel.send({ embeds: [makeEmbed('You have to be in a voice channel to clear the queue!', '#D09CFF')] });
        return;
      }

      if (!serverQueue || serverQueue.songs.length === 0) {
        await message.channel.send({ embeds: [makeEmbed(`There wasn't a queue I could clear!`, '#D09CFF')] });
        return;
      }

      if (serverQueue.songs.length === 1) {
        await message.channel.send({ embeds: [makeEmbed('*There were no queued songs to clear*', '#D09CFF')] });
        return;
      }

      serverQueue.songs = serverQueue.songs.slice(0, 1);
      await message.channel.send({ embeds: [makeEmbed('*Queue cleared!*', '#D09CFF')] });
      return;
    }

    if (lowerContent === `${prefix}decosmic`) {
      const connection = getVoiceConnection(message.guild.id);
      const guildQueue = queue.get(message.guild.id);

      if (guildQueue) {
        clearIdleTimeout(guildQueue);
        queue.delete(message.guild.id);
      }

      connection?.destroy();

      console.log(`${message.member.displayName} decosmic'd the bot`);
      console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥  ✨ is ready!');

      await message.channel.send({ embeds: [makeEmbed('👋🏼 *baiii*', '#D09CFF')] });
      return;
    }

    if (lowerContent === `${prefix}help`) {
      const commandsEmbed = new EmbedBuilder()
        .setTitle('*c o m m a n d s*')
        .setColor('#D09CFF')
        .setThumbnail('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/be21784c-ba2a-4df4-bdd8-b5568ea11ec8/dbjo53q-4683aad4-5549-4d28-ab4c-64f4bfc6a309.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcL2JlMjE3ODRjLWJhMmEtNGRmNC1iZGQ4LWI1NTY4ZWExMWVjOFwvZGJqbzUzcS00NjgzYWFkNC01NTQ5LTRkMjgtYWI0Yy02NGY0YmZjNmEzMDkuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.8s-9vXfdIbwONFVQQ3wMsIeJfFRdkiPwbr2d-jk2tt8')
        .setDescription('\n**music commands** \n**-p**: plays a song from YouTube\n**-q**: displays the queue\n**-skip**: skips a song in queue\n**-next**: skips a song in queue\n**-clear**: clears the queue but keeps the current song playing\n**-stop**: stops the bot and clears the queue\n\n**-decosmic**: disconnects the bot\n**-help**: read this shit again\n\n**other commands**\n**-brownies**: you\'re asking for it\n**-bread**: i think you know what\'s about to happen\n**-derby**: it really tastes like blueberries\n**-guildmaster**: pleathhh\n**-waves**: displays a white boy\'s waves\n**-squid**: displays a man with clam chowder in his beard\n\n**-donate**: show a little love to the dev for keeping the bot alive!');

      await message.channel.send({ embeds: [commandsEmbed] });
      return;
    }

    if (lowerContent === `${prefix}pineapple`) {
      await sendImageEmbed(message, 'pineapple.jpg', null, '#7C47DE');
      return;
    }

    if (lowerContent === `${prefix}dripless`) {
      await sendImageEmbed(message, 'dripless.jpg', null, '#DE0D0D');
      return;
    }

    if (lowerContent === `${prefix}waves`) {
      await sendImageEmbed(message, 'waves.jpg', null, '#8F3AEF');
      return;
    }

    if (lowerContent === `${prefix}yeyur`) {
      await sendImageEmbed(message, 'yeyur.jpg', null, '#1BCCE8');
      return;
    }

    if (lowerContent === `${prefix}squid`) {
      await sendImageEmbed(message, 'squid.jpg', null, '#6b34eb');
      return;
    }

    if (lowerContent === `${prefix}derby`) {
      await sendImageEmbed(message, 'derby.jpg', null, '#53b8a8');
      return;
    }

    if (lowerContent === `${prefix}donate`) {
      const user = await client.users.fetch(ownerId).catch(() => null);
      const attachment = new AttachmentBuilder(path.join(__dirname, 'img', 'donate.jpg'), { name: 'donate.jpg' });
      const donateEmbed = new EmbedBuilder()
        .setTitle('*d o n a t e*')
        .setImage('attachment://donate.jpg')
        .setDescription('This is a small project created with 💛 for the homies of the Discord.\nA donation is absolutely not necessary but always appreciated in keeping this bot\'s server alive!')
        .setColor('#D09CFF')
        .setFooter({
          text: `made with 💛 by ${user ? user.username : 'the dev'}`,
          iconURL: user ? user.displayAvatarURL() : message.member.user.displayAvatarURL(),
        });

      await message.channel.send({ embeds: [donateEmbed], files: [attachment] });
      return;
    }

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('wat?')
          .setDescription('*Need help? Type **-help***')
          .setColor('#D09CFF'),
      ],
    });
  } catch (error) {
    console.log(error);
  }
});

async function handlePlayCommand(message, options = {}) {
  const { forcePlaylist = false } = options;
  const args = message.content.trim().split(/\s+/);
  const searchString = args.slice(1).join(' ').trim();
  const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) {
    await message.channel.send({ embeds: [makeEmbed('You need to be in a voice channel to play music!', '#D09CFF')] });
    return;
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions?.has(PermissionFlagsBits.Speak)) {
    await message.channel.send({ embeds: [makeEmbed('I need the permissions to join and speak in your voice channel!', '#D09CFF')] });
    return;
  }

  if (!searchString) {
    await message.channel.send({ embeds: [makeEmbed('*Tell me what to play first*', '#D09CFF')] });
    return;
  }

  if (url.includes('list=') && (forcePlaylist || !isYouTubeMixUrl(url))) {
    await handlePlaylist(url, message, voiceChannel);
    return;
  }

  const normalizedUrl = isYouTubeMixUrl(url) ? extractPrimaryYouTubeUrl(url) : url;
  const normalizedSearch = isYouTubeMixUrl(url) ? normalizedUrl : searchString;
  const song = await resolveSong(normalizedUrl, normalizedSearch, message);
  if (!song) {
    return;
  }

  await handleVideo(song, message, voiceChannel);
}

async function handlePlaylist(url, message, voiceChannel) {
  let items = [];
  try {
    const playlist = await ytpl(url, { pages: 1 });
    items = playlist.items || [];
  } catch (error) {
    console.log('A playlist could not be found', error);
    items = await resolvePlaylistItems(url).catch((playlistError) => {
      console.log('Playlist fallback failed', playlistError);
      return [];
    });
  }

  if (!items.length) {
    await message.channel.send({ embeds: [makeEmbed('*There was a problem loading the videos.*', '#D09CFF')] });
    return;
  }

  const songs = items.map((item) => normalizeSong({
      title: item.title,
      url: item.shortUrl || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : null),
      thumbnail: item.bestThumbnail?.url,
    }))
    .filter(Boolean);

  if (!songs.length) {
    await message.channel.send({ embeds: [makeEmbed('*There was a problem loading the playlist videos.*', '#D09CFF')] });
    return;
  }

  let serverQueue = queue.get(message.guild.id);
  const playlistLoadingMessage = !serverQueue
    ? await message.channel.send({ embeds: [makeEmbed('*loading in the playlist...*', '#D09CFF')] })
    : null;

  if (!serverQueue) {
    await handleVideo(songs[0], message, voiceChannel, true, playlistLoadingMessage);
    serverQueue = queue.get(message.guild.id);

    if (!serverQueue) {
      return;
    }

    for (const song of songs.slice(1)) {
      primeSongMetadata(song);
      serverQueue.songs.push(song);
    }
  } else {
    serverQueue.textChannel = message.channel;
    serverQueue.voiceChannel = voiceChannel;
    serverQueue.requestedBy = {
      name: message.member.displayName,
      avatarURL: message.member.user.displayAvatarURL(),
    };

    for (const song of songs) {
      primeSongMetadata(song);
      serverQueue.songs.push(song);
    }
  }

  const addedPlaylist = new EmbedBuilder()
    .setTitle('🎶 Playlist added 🎶')
    .setColor('#D09CFF')
    .setDescription(`\n${serverQueue.songs.map((song) => `◦ ${song.title}`).join('\n')}\n\n✨ use ** -q ** or ** -queue ** to bring up this list again. ✨\n`)
    .setFooter({
      text: `brought to you by ${message.member.displayName}`,
      iconURL: message.member.user.displayAvatarURL(),
    });

  await message.channel.send({ embeds: [addedPlaylist] });
}

async function resolveSong(url, searchString, message) {
  if (isYouTubeWatchUrl(url)) {
    return normalizeSong({
      title: searchString || 'YouTube audio',
      url,
      thumbnail: null,
    });
  }

  let videos;
  try {
    const results = await ytSearch(searchString);
    videos = results.videos.slice(0, 10);
  } catch (error) {
    console.log('Search failed', error);
    await message.channel.send({ embeds: [makeEmbed(`*I couldn't find any results via search*`, '#D09CFF')] });
    return null;
  }

  if (!videos.length) {
    await message.channel.send({ embeds: [makeEmbed(`*I couldn't find any results via search*`, '#D09CFF')] });
    return null;
  }

  let index = 0;
  const searchSongList = new EmbedBuilder()
    .setTitle('🔍 Search...')
    .setColor('#D09CFF')
    .setDescription(`\n${videos.map((video) => `${++index} ◦ ${video.title}`).join('\n')}\n\n** 0 ◦ Cancel **\n\n** pick a number and tell me what you 're vibin' with👂🏽 **`);

  await message.channel.send({ embeds: [searchSongList] });

  try {
    const collected = await message.channel.awaitMessages({
      filter: (reply) => reply.author.id === message.author.id,
      max: 1,
      time: 10_000,
      errors: ['time'],
    });

    const response = collected.first();
    if (!response) {
      return null;
    }

    if (response.content === '0') {
      await message.channel.send({ embeds: [makeEmbed('*Cancelling search*', '#D09CFF')] });
      return null;
    }

    const videoIndex = Math.max(1, parseInt(response.content, 10) || 1);
    const selectedVideo = videos[Math.min(videoIndex - 1, videos.length - 1)];
    return normalizeSong(selectedVideo);
  } catch (error) {
    await message.channel.send({ embeds: [makeEmbed('*No song selected, grabbing the first one*', '#D09CFF')] });
    return normalizeSong(videos[0]);
  }
}

async function handleVideo(song, message, voiceChannel, playlist = false, statusMessage = null) {
  let serverQueue = queue.get(message.guild.id);
  const loadingMessage = statusMessage || (!playlist
    ? await message.channel.send({ embeds: [makeEmbed('*loading up your song...*', '#D09CFF')] })
    : null);
  primeSongMetadata(song);

  if (!serverQueue) {
    const existingConnection = getVoiceConnection(message.guild.id);
    existingConnection?.destroy();

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    serverQueue = {
      connection,
      destroyed: false,
      player,
      requestedBy: null,
      songs: [],
      textChannel: message.channel,
      voiceChannel,
      volume: 0.5,
      ffmpegProcess: null,
      ytDlpProcess: null,
      timeoutId: null,
      lastPlaybackError: null,
      pendingStatusMessage: null,
    };

    attachPlayerListeners(message.guild, serverQueue);
    queue.set(message.guild.id, serverQueue);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      if (voiceChannel.type === ChannelType.GuildStageVoice) {
        await message.guild.members.me?.voice.setSuppressed(false).catch(() => null);
      }

      connection.subscribe(player);
    } catch (error) {
      serverQueue.destroyed = true;
      connection.destroy();
      queue.delete(message.guild.id);
      console.log(error);
      if (loadingMessage) {
        await loadingMessage.delete().catch(() => null);
      }
      await message.channel.send({
        embeds: [makeEmbed('*I joined the channel, but Discord voice never became ready to play audio.*', '#D09CFF')],
      });
      return;
    }
  }

  serverQueue.textChannel = message.channel;
  serverQueue.voiceChannel = voiceChannel;
  serverQueue.requestedBy = {
    name: message.member.displayName,
    avatarURL: message.member.user.displayAvatarURL(),
  };
  serverQueue.songs.push(song);

  if (serverQueue.player.state.status !== AudioPlayerStatus.Playing && serverQueue.player.state.status !== AudioPlayerStatus.Buffering) {
    await playSong(message.guild, serverQueue.songs[0], loadingMessage);
    return;
  }

  if (!playlist) {
    await maybeHydrateSongMetadata(song);

    const queueing = new EmbedBuilder()
      .setTitle(`📌 Queuein' up`)
      .setColor('#D09CFF')
      .setDescription(`\n**${song.title}**`)
      .setImage(song.thumbnail || fallbackThumbnail)
      .setFooter({
        text: `queue'd by ${message.member.displayName}`,
        iconURL: message.member.user.displayAvatarURL(),
      });

    await message.channel.send({ embeds: [queueing] });
  }

  if (loadingMessage) {
    await loadingMessage.delete().catch(() => null);
  }
}

function attachPlayerListeners(guild, serverQueue) {
  serverQueue.player.on(AudioPlayerStatus.Idle, async () => {
    serverQueue.songs.shift();
    cleanupPlaybackProcess(serverQueue);

    if (serverQueue.songs.length > 0) {
      const statusMessage = serverQueue.pendingStatusMessage;
      serverQueue.pendingStatusMessage = null;
      await playSong(guild, serverQueue.songs[0], statusMessage);
      return;
    }

    if (serverQueue.pendingStatusMessage) {
      await serverQueue.pendingStatusMessage.delete().catch(() => null);
      serverQueue.pendingStatusMessage = null;
    }

    clearIdleTimeout(serverQueue);
    serverQueue.timeoutId = setTimeout(() => {
      serverQueue.destroyed = true;
      cleanupPlaybackProcess(serverQueue);
      getVoiceConnection(guild.id)?.destroy();
      queue.delete(guild.id);
      console.log('inactive for 5 minutes, disconnecting.');
      console.log('✨ 𝕔 𝕠 𝕤 𝕞 𝕚 𝕔 𝕓 𝕠 𝕥  ✨ is ready!');
    }, idleTimeoutMs);
  });

  serverQueue.player.on('error', (error) => {
    console.error(error);
    serverQueue.songs.shift();
    cleanupPlaybackProcess(serverQueue);
    if (serverQueue.songs.length > 0) {
      const statusMessage = serverQueue.pendingStatusMessage;
      serverQueue.pendingStatusMessage = null;
      void playSong(guild, serverQueue.songs[0], statusMessage);
      return;
    }

    if (serverQueue.pendingStatusMessage) {
      void serverQueue.pendingStatusMessage.delete().catch(() => null);
      serverQueue.pendingStatusMessage = null;
    }

    getVoiceConnection(guild.id)?.destroy();
    serverQueue.destroyed = true;
    queue.delete(guild.id);
  });
}

async function playSong(guild, song, statusMessage = null) {
  const serverQueue = queue.get(guild.id);
  if (!serverQueue || !song) {
    return;
  }

  clearIdleTimeout(serverQueue);
  primeSongMetadata(song);

  try {
    cleanupPlaybackProcess(serverQueue);
    serverQueue.lastPlaybackError = null;
    const resource = await createSongResource(serverQueue, song);

    resource.volume?.setVolume(serverQueue.volume);
    serverQueue.player.play(resource);
  } catch (error) {
    console.error(error);
    if (statusMessage) {
      await statusMessage.edit({
        embeds: [makeEmbed('*I could not start playback for that video.*', '#D09CFF')],
      }).catch(() => null);
    }
    serverQueue.songs.shift();
    if (serverQueue.songs.length > 0) {
      await playSong(guild, serverQueue.songs[0]);
      return;
    }

    serverQueue.destroyed = true;
    getVoiceConnection(guild.id)?.destroy();
    queue.delete(guild.id);
    return;
  }

  if (serverQueue.songs[1]) {
    primeSongMetadata(serverQueue.songs[1]);
  }

  try {
    await entersState(serverQueue.player, AudioPlayerStatus.Playing, 15_000);
  } catch (error) {
    const playbackError = serverQueue.lastPlaybackError || '*I could not start playback for that video.*';
    const playerStatus = serverQueue.player.state.status;
    const playbackLooksHealthy =
      !serverQueue.lastPlaybackError &&
      playerStatus !== AudioPlayerStatus.Idle;

    if (!playbackLooksHealthy) {
      if (statusMessage) {
        await statusMessage.edit({
          embeds: [makeEmbed(playbackError, '#D09CFF')],
        }).catch(() => null);
      } else {
        await serverQueue.textChannel.send({ embeds: [makeEmbed(playbackError, '#D09CFF')] }).catch(() => null);
      }
      console.error(error);
      return;
    }
  }

  await maybeHydrateSongMetadata(song);

  const playing = new EmbedBuilder()
    .setTitle(`🎶 Now Playing 🎶`)
    .setColor('#D09CFF')
    .setDescription(`\n**${song.title}**`)
    .setImage(song.thumbnail || fallbackThumbnail)
    .setFooter({
      text: `brought to you by ${serverQueue.requestedBy?.name || 'cosmic bot'}`,
      iconURL: serverQueue.requestedBy?.avatarURL || client.user?.displayAvatarURL(),
    });

  if (statusMessage) {
    await statusMessage.edit({ embeds: [playing] }).catch(async () => {
      await serverQueue.textChannel.send({ embeds: [playing] });
    });
  } else {
    await serverQueue.textChannel.send({ embeds: [playing] });
  }
  console.log(`${song.title} is now playing`);
}

function normalizeSong(video) {
  const url = video.url || video.webpage_url || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : null);
  if (!url) {
    return null;
  }

  return {
    metadataLoaded: Boolean(video.metadataLoaded),
    metadataPromise: null,
    title: video.title,
    url,
    thumbnail: video.thumbnail || pickThumbnail(video.thumbnails) || fallbackThumbnail,
  };
}

function primeSongMetadata(song) {
  if (!shouldRefreshSongMetadata(song) || song.metadataPromise) {
    return song?.metadataPromise || null;
  }

  song.metadataPromise = resolveVideoMetadata(song.url)
    .then((metadata) => {
      if (!metadata) {
        return null;
      }

      song.title = metadata.title || song.title;
      song.thumbnail = metadata.thumbnail || pickThumbnail(metadata.thumbnails) || song.thumbnail;
      song.metadataLoaded = true;
      return metadata;
    })
    .catch(() => null)
    .finally(() => {
      song.metadataPromise = null;
    });

  return song.metadataPromise;
}

async function maybeHydrateSongMetadata(song, timeoutMs = 0) {
  if (!song) {
    return;
  }

  const metadataPromise = primeSongMetadata(song);
  if (!metadataPromise) {
    return;
  }

  if (!timeoutMs) {
    await metadataPromise;
    return;
  }

  await Promise.race([
    metadataPromise,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function shouldRefreshSongMetadata(song) {
  if (!song?.url || !isYouTubeWatchUrl(song.url)) {
    return false;
  }

  if (song.metadataLoaded) {
    return false;
  }

  return !song.title || song.title === 'YouTube audio' || song.title === song.url || !song.thumbnail || song.thumbnail === fallbackThumbnail;
}

async function resolveVideoMetadata(url) {
  const info = await resolveYtDlpInfo(url);
  return {
    id: info.id,
    title: info.title,
    url: info.webpage_url || url,
    thumbnail: info.thumbnail,
    thumbnails: Array.isArray(info.thumbnails) ? info.thumbnails : [],
  };
}

function isYouTubeWatchUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function isYouTubeMixUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const listId = parsedUrl.searchParams.get('list') || '';
    return isYouTubeWatchUrl(url) && listId.startsWith('RD');
  } catch {
    return false;
  }
}

function extractPrimaryYouTubeUrl(url) {
  if (!url) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === 'youtu.be') {
      return `https://www.youtube.com/watch?v=${parsedUrl.pathname.replace(/^\/+/, '')}`;
    }

    const videoId = parsedUrl.searchParams.get('v');
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  } catch {
    return url;
  }

  return url;
}

async function resolveYtDlpInfo(url) {
  const addHeader = [];
  if (COOKIE) {
    addHeader.push(`cookie:${COOKIE}`);
  }
  const cookieOptions = resolvedCookieFile ? { cookies: resolvedCookieFile } : {};

  try {
    return await youtubeDl(url, {
      dumpSingleJson: true,
      format: 'bestaudio*/best',
      noCheckCertificates: true,
      noWarnings: true,
      noPlaylist: true,
      ...cookieOptions,
      ...(addHeader.length ? { addHeader } : {}),
    });
  } catch (error) {
    if (`${error?.stderr || ''}`.includes('Only Python versions 3.10 and above are supported by yt-dlp')) {
      throw new Error('yt-dlp requires Python 3.10 or newer on this machine.');
    }
    throw error;
  }
}

async function resolvePlaylistItems(url) {
  const addHeader = [];
  if (COOKIE) {
    addHeader.push(`cookie:${COOKIE}`);
  }
  const cookieOptions = resolvedCookieFile ? { cookies: resolvedCookieFile } : {};

  const info = await youtubeDl(url, {
    dumpSingleJson: true,
    flatPlaylist: true,
    yesPlaylist: true,
    noCheckCertificates: true,
    noWarnings: true,
    ...cookieOptions,
    ...(addHeader.length ? { addHeader } : {}),
  });

  const entries = Array.isArray(info?.entries) ? info.entries : [];
  return entries.map((entry) => ({
    title: entry.title,
    url: entry.url || entry.webpage_url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : null),
    id: entry.id,
    thumbnail: entry.thumbnail,
    thumbnails: entry.thumbnails,
  })).filter((entry) => entry.url);
}

async function createSongResource(serverQueue, song) {
  const ytDlp = spawnYtDlpProcess(serverQueue, song.url);
  const probe = await probeYtDlpStream(ytDlp.stdout);

  if (probe.type === StreamType.WebmOpus || probe.type === StreamType.OggOpus) {
    return createAudioResource(probe.stream, {
      inputType: probe.type,
      inlineVolume: true,
    });
  }

  const ffmpeg = spawnFfmpegProcess(serverQueue, probe.stream);
  return createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
  });
}

function spawnYtDlpProcess(serverQueue, url) {
  const ytDlpArgs = [
    url,
    '-f',
    'bestaudio*/best',
    '-o',
    '-',
    '-N',
    '8',
    '--no-playlist',
    '--no-progress',
    '--no-warnings',
    '--no-check-certificates',
  ];

  if (resolvedCookieFile) {
    ytDlpArgs.push('--cookies', resolvedCookieFile);
  } else if (COOKIE) {
    ytDlpArgs.push('--add-header', `cookie:${COOKIE}`);
  }

  const ytDlp = spawn(ytDlpPath, ytDlpArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ytDlp.stdout.on('error', (error) => {
    if (error.code !== 'EPIPE') {
      console.error(`yt-dlp stdout error: ${error.message}`);
    }
  });

  ytDlp.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      console.error(`yt-dlp: ${message}`);
    }
  });

  ytDlp.on('close', () => {
    if (serverQueue.ytDlpProcess === ytDlp) {
      serverQueue.ytDlpProcess = null;
    }
  });

  serverQueue.ytDlpProcess = ytDlp;
  serverQueue.ffmpegProcess = null;

  return ytDlp;
}

async function probeYtDlpStream(stream) {
  return demuxProbe(stream, 2048).catch(() => ({
    stream,
    type: StreamType.Arbitrary,
  }));
}

function spawnFfmpegProcess(serverQueue, inputStream) {
  const ffmpegArgs = [
    '-nostdin',
    '-thread_queue_size',
    '1024',
    '-fflags',
    'nobuffer',
    '-flags',
    'low_delay',
    '-probesize',
    '32k',
    '-i',
    'pipe:0',
    '-vn',
    '-sn',
    '-dn',
    '-loglevel',
    'error',
    '-f',
    's16le',
    '-ar',
    '48000',
    '-ac',
    '2',
    'pipe:1'
  ];

  const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  ffmpeg.stdin.on('error', (error) => {
    if (error.code !== 'EPIPE') {
      console.error(`ffmpeg stdin error: ${error.message}`);
    }
  });

  inputStream.pipe(ffmpeg.stdin);

  ffmpeg.stderr.on('data', (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      console.error(`ffmpeg: ${message}`);
    }
  });

  ffmpeg.on('close', () => {
    if (serverQueue.ffmpegProcess === ffmpeg) {
      serverQueue.ffmpegProcess = null;
    }
  });

  serverQueue.ffmpegProcess = ffmpeg;
  return ffmpeg;
}

function initializeCookieFile() {
  const configuredPath = COOKIE_FILE
    ? (path.isAbsolute(COOKIE_FILE) ? COOKIE_FILE : path.resolve(__dirname, COOKIE_FILE))
    : path.resolve(__dirname, 'cookies.txt');

  const decodedCookies = decodeCookieSecret();

  if (decodedCookies) {
    fs.mkdirSync(path.dirname(configuredPath), { recursive: true });
    fs.writeFileSync(configuredPath, decodedCookies, 'utf8');
    return configuredPath;
  }

  if (COOKIE_FILE && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  return null;
}

function decodeCookieSecret() {
  if (YT_COOKIES_BASE64) {
    return Buffer.from(YT_COOKIES_BASE64, 'base64').toString('utf8');
  }

  if (YT_COOKIES) {
    return YT_COOKIES
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  return null;
}

function logCookieStatus() {
  if (!resolvedCookieFile) {
    console.log('yt-dlp cookies: disabled');
    return;
  }

  try {
    const stats = fs.statSync(resolvedCookieFile);
    console.log(`yt-dlp cookies: enabled path=${resolvedCookieFile} bytes=${stats.size}`);
  } catch (error) {
    console.log(`yt-dlp cookies: configured but unreadable path=${resolvedCookieFile} error=${error.message}`);
  }
}

function cleanupPlaybackProcess(serverQueue) {
  if (serverQueue?.ytDlpProcess) {
    serverQueue.ytDlpProcess.kill('SIGKILL');
    serverQueue.ytDlpProcess = null;
  }

  if (serverQueue?.ffmpegProcess) {
    serverQueue.ffmpegProcess.kill('SIGKILL');
    serverQueue.ffmpegProcess = null;
  }
}

function pickThumbnail(thumbnails) {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
    return null;
  }

  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || null;
}

function makeEmbed(description, color) {
  return new EmbedBuilder().setDescription(description).setColor(color);
}

async function sendImageEmbed(message, fileName, description, color) {
  const attachment = new AttachmentBuilder(path.join(__dirname, 'img', fileName), { name: fileName });
  const embed = new EmbedBuilder().setColor(color).setImage(`attachment://${fileName}`);

  if (description) {
    embed.setDescription(description);
  }

  await message.channel.send({ embeds: [embed], files: [attachment] });
}

function clearIdleTimeout(serverQueue) {
  if (serverQueue?.timeoutId) {
    clearTimeout(serverQueue.timeoutId);
    serverQueue.timeoutId = null;
  }
}

client.login(token);
