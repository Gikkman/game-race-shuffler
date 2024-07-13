import Main from './Main.js';

const main = new Main();
main.start();

process.on("SIGINT", () => {
  console.log(" > SIGINT");
  console.log("Initiating controlled shutdown");
  main.shutdown();
});
