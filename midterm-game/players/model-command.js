const args = process.argv.slice(2);
if (args.includes("--watch") || args.includes("--scenario")) await import("./watch-server.js");
else await import("./run.js");
