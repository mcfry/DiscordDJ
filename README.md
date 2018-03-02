# Discord DJ
##### Play music from youtube locally and rely on your own connection, supports playlists

##### To get it running you will need to:
1. Install FFmpeg
2. Get an api key from youtube and add it to config.js
3. Run it locally from node with node discord_dj.js

##### Install
1. Go to https://discordapp.com/developers
2. Add a new app and create a bot user
3. Copy bot user token to bottom of discord_dj.js
4. Copy your client id into the following url and add the bot to your server https://discordapp.com/oauth2/authorize?&client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=0

##### Use:
1. -join <channel name> (moves the bot to a channel)
2. -play <youtube link or search term> (plays any audio quickly)
3. -stop (stops any currently playing audio)
4. -pause (pauses currently playing music)
5. -resume (resumes paused music)
6. -new <playlist name> (creates a new playlist)
7. -add <playlist name> <position in playlist[number]> <youtube link or search term>
8. -remove <playlist name> <position in playlist[number]> (removes a song from a playlist)
9. -list <playlist name> (list all songs in current playlist and their order)
10. -playlist <playlist name> (start playing, or restart, the playlist)
11. -next (skip a song in a playlist)
12. -delete <playlist name> (deletes the playlist)
13. -help (repeat this list)
