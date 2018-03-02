var Discord = require("discord.js");
var ytdl = require('ytdl-core');
var fs = require('fs');
var requestify = require('requestify');
var config = require('./config.js');

var API_KEY = config.key();

var bot = new Discord.Client();

var vUrl,
	vTitle,
	vConnection,
	vStream,
	vData, //global so playlist can play updated version
	channel;

//flags
var isPlaylistStreaming = false;

bot.on("message", function(m) {

	// Strip the -<command> from the content string
	var commandContent = m.content.split(" ");
	commandContent.splice(0, 1);
	var commandString = commandContent;
	commandString = commandString.join(" ");

	//
	// -join <channel name>
	// NOTE: Needs to be run each time bot is restarted
	////
	if (m.content.startsWith('-join')) {
		bot.channels.forEach(function(item) {
			if (item.name === commandString) {
				channel = item;
			}
		});

		if (channel === undefined || channel === null) {
			return;
		}

		vConnection = channel.join();

		m.reply("\n1: -join <channel name> (moves the bot to a channel)\n2: -play <youtube link or search term> (plays any audio quickly)\n3: -stop (stops any currently playing audio)\n4: -pause (pauses currently playing music)\n5: -resume (resumes paused music)\n6: -new <playlist name> (creates a new playlist)\n7: -add <playlist name> <postion in playlist[number]> <youtube link or search term>\n8: -remove <playlist name> <position in playlist[number]> (removes a song from a playlist)\n9: -list <playlist name> (list all songs in current playlist and their order)\n10: -playlist <playlist name> (start playing, or restart, the playlist)\n11: -next (skip a song in a playlist)\n12: -delete <playlist name> (deletes the playlist)\n13: -help (repeat this list)");

		// Return to prevent execution of further commands
		return;
	}

	//
	// -help
	////
	if (m.content.startsWith('-help')) {
		m.reply("\n1: -join <channel name> (moves the bot to a channel)\n2: -play <youtube link or search term> (plays any audio quickly)\n3: -stop (stops any currently playing audio)\n4: -pause (pauses currently playing music)\n5: -resume (resumes paused music)\n6: -new <playlist name> (creates a new playlist)\n7: -add <playlist name> <postion in playlist[number]> <youtube link or search term>\n8: -remove <playlist name> <position in playlist[number]> (removes a song from a playlist)\n9: -list <playlist name> (list all songs in current playlist and their order)\n10: -playlist <playlist name> (start playing, or restart, the playlist)\n11: -next (skip a song in a playlist)\n12: -delete <playlist name> (deletes the playlist)\n13: -help (repeat this list)");

		// Return to prevent execution of further commands
		return;
	}

	//
	// -play <youtube link or search>
	////
	if (m.content.startsWith('-play') && !m.content.startsWith('-playlist')) {
		if (checkUrl(commandContent[0])) {
			// Extract the video id from a valid url
			var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
			var match = commandString.match(regExp);
			if (match && match[2].length == 11) {
				// another fucboi check
				if (match[2] === 'kfVsfOSbJY0' || match[2] === 'DPVTl9K0lqc') {
					m.reply("Fuck you.");
					return;
				}
				commandContent[0] = match[2];
			} else {
				m.reply("Error with url.");
			}
		}

		if (badCheck(commandString)) {
			m.reply("Fuck you.");
			return;
		}
		var streamOptions = { seek: 0, volume: 0.08, passes: 2 };

		vConnection.then(connection => {
			requestify.get(`https://www.googleapis.com/youtube/v3/search?q=${commandString}&key=${API_KEY}&part=snippet&type=video`).then(function(response) {
				data = JSON.parse(response.body);
				vUrl = data.items[0].id.videoId;
				vTitle = data.items[0].snippet.title;

				var stream = ytdl('https://www.youtube.com/watch?v=' + vUrl, {filter : 'audioonly'});
				vStream = connection.playStream(stream, streamOptions);

				m.reply(`Playing ${vTitle}.`);
			}).fail(function(response) {
				console.log(response);
				m.reply(`Failed to get information from youtube: error code ${response.getCode()}`);
				return;
			});
		}).catch(error => {
			console.log(error);
		});

		// Return to prevent execution of further commands
		return;
	}

	// Note: function at bottom of page to build out play tree
	//
	// -playlist <playlist name>
	////
	if (m.content.startsWith("-playlist")) {
		// If the voice connection exists
		if (vStream !== undefined && vConnection !== undefined) {
			vConnection.then(connection => {
				if (connection.speaking) {
					// check flag and change if active
					if (isPlaylistStreaming === true) {
						isPlaylistStreaming = false;
					}

					// stop it
					vStream.end();
					m.reply("Stopped playing.");
				}
			});
		} 

		fs.access('./playlists/' + commandContent[0] + '.txt', fs.F_OK, function(err) {
		    if (!err) {
				vData = fs.readFileSync('./playlists/' + commandContent[0] + '.txt').toString().split("\n");

				vConnection.then(connection => {
					playSongInList(m, connection, 0);
				})
				.catch(console.error);
			} else {
				m.reply("Playlist doesn't exist.");
			}
		});

		// Return to prevent execution of further commands
		return;
	}

	//
	// -stop
	////
	if (m.content.startsWith("-stop")) {
		if (vStream !== undefined && vConnection !== undefined) {
			vConnection.then(connection => {
				if (connection.speaking) {
					// check flag and change if active
					if (isPlaylistStreaming === true) {
						isPlaylistStreaming = false;
					}

					// stop it
					vStream.end();
					m.reply("Stopped playing.");
				}
			});
		} else {
			m.reply("Not currently playing anything, but never stop never stopping.");
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -pause
	////
	if (m.content.startsWith("-pause")) {
		if (vStream !== undefined && vConnection !== undefined) {
			vConnection.then(connection => {
				if (connection.speaking) {
					// pause it
					vStream.pause();
					m.reply("Paused playing.");
				} else {
					m.reply("Not currently playing anything, but never pause never pausing.");
				}
			});
		} else {
			m.reply("Not currently playing anything, but never pause never pausing.");
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -resume
	////
	if (m.content.startsWith("-resume")) {
		if (vStream !== undefined && vConnection !== undefined) {
			vConnection.then(connection => {
				if (vStream.paused) {
					// stop it
					vStream.resume();
					m.reply("Resume playing.");
				} else {
					m.reply("Nothing is paused.");
				}
			});
		} else {
			m.reply("Not currently playing anything, but never resume never resuming.");
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -next (req: must be playing a playlist)
	////
	if (m.content.startsWith("-next")) {
		if (vStream !== undefined && vConnection !== undefined) {
			// return if inactive
			if (isPlaylistStreaming === false) {
				m.reply("Not currently playing a playlist. A playlist must be playing to use -next.");
				return;
			}

			vConnection.then(connection => {
				if (connection.speaking) {
					// stop it
					vStream.end();
					m.reply("Stopped playing.");
				}
			});
		} else {
			m.reply("Not currently playing anything, but never stop never stopping.");
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -list <playlist name>
	////
	if (m.content.startsWith('-list')) {
		if (checkValid(commandContent[0])) {
			// Else, not returning
			// Check if exists
			fs.access('./playlists/' + commandContent[0] + '.txt', fs.F_OK, function(err) {
			    if (!err) {
					data = fs.readFileSync('./playlists/' + commandContent[0] + '.txt').toString();

					if (checkValid(data)) {
					    m.reply("\n" + data.toString());
					} else {
						m.reply("Playlist is empty.");
					}
				} else {
					m.reply("Playlist doesn't exist.");
				}
			});
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -new <playlist name>
	////
	if (m.content.startsWith('-new')) {
		if (checkValid(commandContent[0])) {
			fs.writeFile('./playlists/' + commandContent[0] + '.txt', "", { flag: 'wx' }, function (err) {
			    if (err) {
			    	m.reply('The playlist already exists.');
			    } else {
			    	m.reply('Created playlist.');
			    }
			});
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -add <playlist> <number> <youtube link or search>
	////
	if (m.content.startsWith('-add')) {
		if (checkValid(commandContent[0]) && checkValid(commandContent[1]) && checkValid(commandContent[2])) {

			numberInput = parseInt(commandContent[1]);
			if (!Number.isInteger(numberInput)) {
				if (numberInput <= 0) {
					m.reply("Invalid format: the second input parameter must be greater than 0.");
					return;
				}
				m.reply("Invalid format: the second input parameter must be a number.");
				return;
			}

			var stringifiedThirdParam = commandContent.slice(); //make a copy
			stringifiedThirdParam.splice(0, 2);
			stringifiedThirdParam = stringifiedThirdParam.join(" ");

			if (badCheck(stringifiedThirdParam)) {
				m.reply("Fuck you.");
				return;
			}

			// Make sure that if third param is a url, it's for youtube
			if (checkUrl(stringifiedThirdParam.toString())) {
				var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
				var match = stringifiedThirdParam.match(regExp);
				if (!match || match[2].length !== 11) {
					m.reply("Invalid format: url detected as third param, but it's not youtube.");
					return;
				}
			}

			// Else, not returning
			// Check if exists
			fs.access('./playlists/' + commandContent[0] + '.txt', fs.F_OK, function(err) {
			    if (!err) {
					var data = fs.readFileSync('./playlists/' + commandContent[0] + '.txt').toString().split("\n");

					console.log(data);
					var writeData;

					// Blank Case
					if (data[0] === '') {
						writeData = `${commandContent[1]} ${stringifiedThirdParam}`;
					} else {
						var bestIndex;
						var replace = 0;
						data.some(function(line, index) {
							words = line.split(" ");
							if (parseInt(words[0]) === parseInt(commandContent[1])) {
								console.log('equal');
								bestIndex = index;
								replace = 1;
								return true;
							} else if (data[index+1] === undefined && bestIndex === undefined) {
								data.splice(index + 1, 0, `${commandContent[1]} ${stringifiedThirdParam}`);
								return true; //exit loop
							}

							// else
							if (parseInt(words[0]) < parseInt(commandContent[1])) {
								bestIndex = index + 1;
							}
						});

						if (bestIndex !== undefined) {
							data.splice(bestIndex, replace, `${commandContent[1]} ${stringifiedThirdParam}`);
						}

						vData = data;
						writeData = data.join("\n");
					}

					fs.writeFile('./playlists/' + commandContent[0] + '.txt', writeData, function(err) {
						if (err) {
							m.reply("There was an error updating the playlist.");
						} else {
							m.reply("Playlist updated.");
						}
					});
			    } else {
			    	console.log(err);
			        // It isn't accessible
			        m.reply("The playlist doesn't exist.");
			    }
			});
			
		} else {
			m.reply("Missing one or more of the three parameters.");
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -remove <playlist> <number>
	////
	if (m.content.startsWith('-remove')) {
		if (checkValid(commandContent[0]) && checkValid(commandContent[1])) {

			numberInput = parseInt(commandContent[1]);
			if (!Number.isInteger(numberInput)) {
				if (numberInput <= 0) {
					m.reply("Invalid format: the second input parameter must be greater than 0.");
					return;
				}
				m.reply("Invalid format: the second input parameter must be a number.");
				return;
			}

			// Else, not returning
			// Check if exists
			fs.access('./playlists/' + commandContent[0] + '.txt', fs.F_OK, function(err) {
			    if (!err) {
					var data = fs.readFileSync('./playlists/' + commandContent[0] + '.txt').toString().split("\n");

					console.log(data);
					var writeData;

					// Blank Case
					if (data[0] === '') {
						m.reply("Playlist is blank, can't remove anything.");
					} else {
						data.some(function(line, index) {
							words = line.split(" ");
							if (parseInt(words[0]) === parseInt(commandContent[1])) {
								console.log('equal');
								bestIndex = index;
								replace = 1;
								return true;
							}
						});

						if (bestIndex !== undefined) {
							data.splice(bestIndex, replace);
						} else {
							m.reply(`${commandContent[1]} not found in playlist.`);
							return;
						}

						vData = data;
						writeData = data.join("\n");
					}

					fs.writeFile('./playlists/' + commandContent[0] + '.txt', writeData, function(err) {
						if (err) {
							m.reply("There was an error updating the playlist.");
						} else {
							m.reply("Playlist updated.");
						}
					});
			    } else {
			    	console.log(err);
			        // It isn't accessible
			        m.reply("The playlist doesn't exist.");
			    }
			});
			
		}

		// Return to prevent execution of further commands
		return;
	}

	//
	// -delete
	////
	if (m.content.startsWith('-delete')) {
		if (checkValid(commandContent[0])) {
			fs.unlink('./playlists/' + commandContent[0] + '.txt', function(err) {
				if (err) {
					console.log(err);
					m.reply(`There is no playlist named ${commandContent} to delete.`);
				} else {
					m.reply("Playlist removed.");
				}
			});
		}

		// Return to prevent execution of further commands
		return;
	}

});

// Return true if input isn't blank, otherwise false
var checkValid = function(entered) {
	if (entered === undefined || entered === "" || entered === " " || entered == null) {
		return false;
	} else {
		return true;
	}
}

// Check if a string is a url using regex spec
var checkUrl = function(str) {
	return str.match(/^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i);
}

var playSongInList = function(m, connection, currentlyPlaying) {
	var streamOptions = { seek: 0, volume: 0.08, passes: 2 };

	songData = vData[currentlyPlaying].split(" ")
	numberInPlaylist = songData.slice(0, 1)[0];
	songData.splice(0, 1);

	// Extract the video id if the song data was saved as a url
	if (checkUrl(songData[0])) {
		var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
		var match = songData[0].match(regExp);
		if (match && match[2].length == 11) {
			songData[0] = match[2];
		} else {
			m.reply("Error with url.");
		}
	}

	// This doesn't matter if [0] is a url
	songData.join(" ");

	requestify.get(`https://www.googleapis.com/youtube/v3/search?q=${songData}&key=${API_KEY}&part=snippet&type=video`).then(function(response) {
		rData = JSON.parse(response.body);
		vUrl = rData.items[0].id.videoId;
		vTitle = rData.items[0].snippet.title;

		var stream = ytdl('https://www.youtube.com/watch?v=' + vUrl, {filter : 'audioonly'});
		vStream = connection.playStream(stream, streamOptions);

		// set flag
		isPlaylistStreaming = true;

		vStream.on('end', function() {
			// check if flag was changed
			if (isPlaylistStreaming === false) {
				return;
			}

			currentlyPlaying += 1;
			if (checkValid(vData[currentlyPlaying])) {
				playSongInList(m, connection, currentlyPlaying);
			}
		});

		m.reply(`Playing ${numberInPlaylist}: ${vTitle}.`);
	}).fail(function(response) {
		console.log(response);
		m.reply(`Failed to get information from youtube: error code ${response.getCode()}`);
		return;
	});
}

// Check for unwanted songs
var badCheck = function(str) {
	return str.toString().match(/ *r *e *b *e *c *c *a| *b *l *a *c *k| *f *r *i *d *a *y| *b *l *a *k| *f *r *i *d *e *y/i);
}

bot.login("your bot token here");