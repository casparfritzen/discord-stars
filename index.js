require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();
const moment = require("moment");

const DISCORD_PREFIX = "?";
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

console.log("ufffff");

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: 'postgresql://root:root@localhost:5432/bot',
  ssl: true,
  ssl: { rejectUnauthorized: false },
});

console.log("yeah its workinnnn");

pool.query(
  `
  DROP TABLE stars;
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
          name: `${DISCORD_PREFIX}help | github.com/DDynamic/discord-stars`,
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
Discord Stars, a simple Discord bot to reward your server members, created by @DDynamic. Licensed under the MIT License. \`\`\`
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
              "SELECT user_id, COUNT(*) AS stars FROM stars WHERE server_id = $1 GROUP BY user_id ORDER BY stars DESC",
              [msg.guild.id],
              (err, res) => {
                var embed = new Discord.RichEmbed();
                leaderboard = `**:star: Star Leaderboard**\n\n`;

                if (res.rows.length > 0) {
                  for (let row in res.rows) {
                    row = res.rows[row];
                    leaderboard += `<@!${row["user_id"]}>: ${
                      row["stars"]
                    } TIFI${row["stars"] != "1" ? "s" : ""}\n`;
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
                    stars = `**Showing the Latest 10 Stars for <@!${mention.id}>**\n\n`;

                    for (let row in res.rows) {
                      row = res.rows[row];
                      stars += `(#${row["id"]}) From <@!${
                        row["author_id"]
                      }> on ${moment(row["created_at"]).format("l")}: ${
                        row["text"]
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
                  var stars = res.rows[0]["count"];

                  var embed = new Discord.RichEmbed();

                  embed.setDescription(
                    `<@!${mention.id}> has ${stars} star${
                      stars != 1 ? "s" : ""
                    }.`
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
                  msg.reply("star added.");
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
                  msg.reply(`star #${id} deleted.`);
                }
              );
            } else {
              msg.reply(
                "you must have the **Manage Server** permission to run this command."
              );
            }

            break;
          case "daily":
            var id = msg.member.id;

            var text = msg.content.split(" ").slice(2).join(" ");

            pool.query(
              "INSERT INTO stars (server_id, user_id, author_id, text) VALUES ($1, $2, $3, $4)",
              [msg.guild.id, id, msg.author.id, "this is a real TIFI"],
              (err, res) => {
                msg.reply("0.1 TIFI earned.");
              }
            );

            break;
        }
      }
    });

    client.login(DISCORD_TOKEN);
  }
);
