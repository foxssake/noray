import { Command, type CommandSpec } from "@lib/command.js";
import { bench, do_not_optimize, run } from "mitata";

let idx = 0;
const commands: CommandSpec[] = [
  { name: "whereami", isRequest: true, requestId: "" },
  {
    name: "session/set-game-id",
    isRequest: true,
    requestId: "",
    params: ["RghrnyJK0mUA7cW05fCKo"],
  },
  {
    name: "lobby/create",
    isRequest: true,
    requestId: "",
    params: ["noray://example.com:8890/Q9VKjXiAlwVK"],
    kvParams: [["name", "Cool Lobby"]],
  },
  { name: "lobby/lock", isRequest: true, requestId: "", text: "YuDqpQovXvpc" },
  {
    name: "lobby/delete",
    isRequest: true,
    requestId: "",
    params: ["YuDqpQovXvpc"],
  },
];

bench("serialize commands", () => {
  do_not_optimize(Command.serialize(commands[idx]));
  idx = (idx + 1) % commands.length;
});

await run();
