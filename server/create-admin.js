// Поставува/менува го единствениот администраторски корисник.
//
// Се пушта рачно на серверот, НИКОГАШ од git или од CI — лозинката се
// внесува во моментот, скриена, и никогаш не поминува низ оваа датотека,
// низ git, низ environment променливи во кодот, ниту низ chat/AI сесија.
//
//   node create-admin.js
//
// Прашува за корисничко име и лозинка (двапати, за потврда), ја хашира со
// scrypt (password.js) и ја запишува во admin_users. Ако корисничкото име
// веќе постои, само ја менува лозинката (upsert) — ова е намерно единствен
// начин да се „регистрира" администратор, нема јавна рута за тоа.

import readline from "node:readline";
import { openDb } from "./db.js";
import { hashPassword } from "./password.js";

// Еден readline интерфејс за целиот скрипт, не по прашање: затворање и
// правење нов веднаш потоа губи влез кога влезот не доаѓа од вистински
// терминал (пренасочен/тестиран влез) — проверено.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer.trim()));
  });
}

/*
  Маскирање знак-по-знак работи само со вистински терминал (TTY); без него
  (пренасочен влез, тестирање) влезот едноставно не се маскира — прифатливо,
  зашто тоа се случува само надвор од вистинска интерактивна употреба.
*/
function askHidden(query) {
  if (!process.stdin.isTTY) return ask(query);

  return new Promise((resolve) => {
    let muted = false;
    const original = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (text) => {
      if (!muted) original(text);
    };

    muted = true;
    rl.question(query, (answer) => {
      muted = false;
      rl._writeToOutput = original;
      rl.history = rl.history.slice(1);
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  console.log("=== Поставување администратор за display.mk ===\n");

  const username = await ask("Корисничко име: ");

  if (!username) {
    console.error("Корисничкото име не смее да биде празно.");
    rl.close();
    process.exit(1);
  }

  const password = await askHidden("Лозинка (се крие при пишување): ");

  if (password.length < 12) {
    console.error("Лозинката мора да има барем 12 знаци.");
    rl.close();
    process.exit(1);
  }

  const confirm = await askHidden("Потврди ја лозинката: ");

  if (password !== confirm) {
    console.error("Лозинките не се исти. Ништо не е зачувано.");
    rl.close();
    process.exit(1);
  }

  const db = openDb();
  const now = Date.now();
  const hash = hashPassword(password);

  const existing = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(username);

  if (existing) {
    db.prepare("UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      hash,
      now,
      existing.id
    );
    console.log(`\n✓ Лозинката за „${username}" е сменета.`);
  } else {
    db.prepare(
      "INSERT INTO admin_users (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run(username, hash, now, now);
    console.log(`\n✓ Администраторот „${username}" е создаден.`);
  }

  db.close();
  console.log("Сега можеш да се најавиш на https://display.mk/admin\n");
  rl.close();
}

main().catch((error) => {
  console.error("Грешка:", error.message);
  rl.close();
  process.exit(1);
});
