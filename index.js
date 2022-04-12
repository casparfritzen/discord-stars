require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();
const moment = require("moment");

const DISCORD_PREFIX = "?";
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ECONOMY_CHANNELID = "959473793179475998"; //959473793179475998 testing in bot commands //for production in economy channel: "961583354807984168"
const TIFI_MULTI = 0.1;
const STREAK_MULT = 10;

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: 'postgresql://root:root@localhost:5432/bot',
  ssl: true,
  ssl: { rejectUnauthorized: false },
});

//DROP TABLE stars;
pool.query(
  `
  CREATE TABLE IF NOT EXISTS stars ();
  ALTER TABLE stars ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
  ALTER TABLE stars ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT current_timestamp;
  ALTER TABLE stars ADD COLUMN IF NOT EXISTS server_id VARCHAR NOT NULL;
  ALTER TABLE stars ADD COLUMN IF NOT EXISTS user_id VARCHAR NOT NULL;
  ALTER TABLE stars ADD COLUMN IF NOT EXISTS author_id VARCHAR NOT NULL;
  ALTER TABLE stars ADD COLUMN IF NOT EXISTS text VARCHAR NOT NULL;
`,
  (err, res) => {
    client.on("ready", () => {
      client.user.setPresence({
        game: {
          name: `${DISCORD_PREFIX}help | countin' ma TIFI`,
        },
      });
      console.log(`Logged in as ${client.user.tag}!`);
    });

    client.on("message", (msg) => {
      if (msg.content.startsWith(DISCORD_PREFIX)) {
        switch (
        msg.content.split(DISCORD_PREFIX)[1].split(" ")[0]
        ) {
          case "help":
            msg.channel.send(`
Discord TIFI (Stars), a simple Discord bot to reward our server members, created by @DDynamic, modified by @casparfritzen. Licensed under the MIT License. \`\`\`
${DISCORD_PREFIX}help - shows helpful information
${DISCORD_PREFIX}leaderboard - lists members and a count of their TIFI
${DISCORD_PREFIX}list <@Member> - lists a member's TIFI
${DISCORD_PREFIX}count <@Member> - counts a member's TIFI
${DISCORD_PREFIX}add <@Member> <message> - adds a TIFI to a member
${DISCORD_PREFIX}delete <star_id> - deletes a TIFI, find the star_id via the list command
\`\`\`
          `);
            break;
          case "leaderboard":
            pool.query(
              "SELECT user_id, COUNT(*) AS stars FROM stars WHERE server_id = $1 GROUP BY user_id ORDER BY stars DESC LIMIT 10",
              [msg.guild.id],
              (err, res) => {
                var embed = new Discord.RichEmbed();
                leaderboard = `**:star: TIFI Leaderboard**\n\n`;

                if (res.rows.length > 0) {
                  for (let row in res.rows) {
                    row = res.rows[row];
                    leaderboard += `<@!${row["user_id"]}>: ${((row["stars"]) * TIFI_MULTI).toFixed(1)
                      } TIFI\n`;
                  }
                } else {
                  leaderboard += "No TIFI found.";
                }

                embed.setDescription(leaderboard);
                embed.setColor(15844367);

                msg.channel.send(embed);
              }
            );
            break;
            
          case "list":
            var mention = msg.mentions.members.first();

            if (mention) {
              pool.query(
                "SELECT * FROM stars WHERE user_id = $1 AND server_id = $2 ORDER BY created_at DESC LIMIT 10",
                [mention.id, msg.guild.id],
                (err, res) => {
                  var stars = `**No Stars Recorded for <@!${mention.id}>**`;
                  var embed = new Discord.RichEmbed();

                  if (res.rows.length > 0) {
                    stars = `**Showing the Latest 10 TIFI for <@!${mention.id}>**\n\n`;

                    for (let row in res.rows) {
                      row = res.rows[row];
                      stars += `(#${row["id"]}) From <@!${row["author_id"]
                        }> on ${moment(row["created_at"]).format("l")}: ${row["text"]
                        }\n`;
                    }
                  }

                  embed.setDescription(stars);
                  embed.setColor(15844367);

                  msg.channel.send(embed);
                }
              );
            }
            break;

          case "count":
            var mention = msg.mentions.members.first();

            if (mention) {
              pool.query(
                "SELECT COUNT(*) FROM stars WHERE user_id = $1 AND server_id = $2",
                [mention.id, msg.guild.id],
                (err, res) => {
                  //console.log(res.rows[0])
                  var stars = ((res.rows[0]["count"]) * TIFI_MULTI).toFixed(1);

                  var embed = new Discord.RichEmbed();

                  embed.setDescription(
                    `<@!${mention.id}> has ${stars} TIFI.`
                  );
                  embed.setColor(15844367);

                  msg.channel.send(embed);
                }
              );
            }
            break;

          case "add":
            if (msg.member.hasPermission("MANAGE_GUILD")) {
              var id = msg.mentions.members.first().id;
              var text = msg.content.split(" ").slice(2).join(" ");

              pool.query(
                "INSERT INTO stars (server_id, user_id, author_id, text) VALUES ($1, $2, $3, $4)",
                [msg.guild.id, id, msg.author.id, text],
                (err, res) => {
                  msg.reply("TIFI added.");
                }
              );
            } else {
              msg.reply(
                "you must have the **Manage Server** permission to run this command."
              );
            }
            break;

          case "delete":
            if (msg.member.hasPermission("MANAGE_GUILD")) {
              var id = msg.content.split(" ")[1];

              pool.query(
                "DELETE FROM stars WHERE id = $1 and server_id = $2",
                [id, msg.guild.id],
                (err, res) => {
                  msg.reply(`TIFI #${id} deleted.`);
                }
              );
            } else {
              msg.reply(
                "you must have the **Manage Server** permission to run this command."
              );
            }
            break;

          case "daily":
            if (msg.channel.id !== ECONOMY_CHANNELID) break;

            var id = msg.member.id;
            var text = msg.content.split(" ").slice(2).join(" ");

            pool.query(
              "SELECT * FROM stars WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 HOUR';",
              [id],
              (err, res) => {
                if (res !== null) { //res !== null
                  if (res.rowCount == 0) {
                    pool.query(
                      "INSERT INTO stars (server_id, user_id, author_id, text) VALUES ($1, $2, $3, $4)",
                      [msg.guild.id, id, msg.author.id, "this is a real TIFI: " + text],
                      (err, res) => {
                        msg.reply(TIFI_MULTI + " TIFI earned.");
                      }
                    );
                  } else {
                    msg.reply("You can only claim your TIFI every 24h!");
                  }
                } else {
                  pool.query(
                    "INSERT INTO stars (server_id, user_id, author_id, text) VALUES ($1, $2, $3, $4)",
                    [msg.guild.id, id, msg.author.id, "this is a real TIFI: " + text],
                    (err, res) => {
                      msg.reply(TIFI_MULTI + " TIFI earned.");
                    }
                  )
                }
              }
            );
            break;

          case "test":
            if (msg.member.hasPermission("MANAGE_GUILD")) {
              var count = msg.content.split(" ")[1];
              var tifi = 0;

              for (let fiels in count) {
                tifi++;
                pool.query(
                  "INSERT INTO stars (server_id, user_id, author_id, text) VALUES ($1, $2, $3, $4)",
                  [msg.guild.id, msg.author.id, msg.author.id, "this is a test"],
                  (err, res) => {
                    //msg.reply("TIFI added.");
                  }
                );
                pool.query(
                  "SELECT * FROM stars WHERE created_at > NOW() - INTERVAL '24 HOUR';",
                  (err, res) => {
                    console.log(res.rows)
                  }
                );
              }
              msg.reply(tifi + " TIFI will be added.");
            } else {
              msg.reply(
                "you must have the **Manage Server** permission to run this command."
              );
            }
            break;

          case "reset":
            if (msg.member.hasPermission("MANAGE_GUILD")) {
              pool.query(
                `
                DROP TABLE stars;`,
                (err, res) => {
                  msg.reply(`reset complete.`);
                }
              );
              pool.query(
                `
                CREATE TABLE IF NOT EXISTS stars ();
                ALTER TABLE stars ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
                ALTER TABLE stars ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT current_timestamp;
                ALTER TABLE stars ADD COLUMN IF NOT EXISTS server_id VARCHAR NOT NULL;
                ALTER TABLE stars ADD COLUMN IF NOT EXISTS user_id VARCHAR NOT NULL;
                ALTER TABLE stars ADD COLUMN IF NOT EXISTS author_id VARCHAR NOT NULL;
                ALTER TABLE stars ADD COLUMN IF NOT EXISTS text VARCHAR NOT NULL;
                `,
                (err, res) => {
                  msg.reply(`new table created.`);
                }
              );
            } else {
              msg.reply(
                "you must have the **Manage Server** permission to run this command."
              );
            }
            break;
        }
      }
    });

    client.login(DISCORD_TOKEN);
  }
);
