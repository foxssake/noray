import { TrimsockReader } from "@lib/reader.js";
import { bench, do_not_optimize, run } from "mitata";

const reader = new TrimsockReader();
let idx = 0;
const commands = [
  "whereami?\n",
  "session/set-game-id RghrnyJK0mUA7cW05fCKo\n",
  'lobby/create? noray://example.com:8890/Q9VKjXiAlwVK name="Cool Lobby"\n',
  "lobby/lock? YuDqpQovXvpc",
  "lobby/delete? YuDqpQovXvpc",
];

bench("ingest and parse", () => {
  reader.ingest(commands[idx]);
  do_not_optimize([...reader.commands()]);
  idx = (idx + 1) & commands.length;
});

await run();
