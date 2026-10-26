// Испраќа е-пошта преку Resend. Клучот доаѓа од RESEND_API_KEY (environment
// variable) — не во git; на серверот е во /opt/display-mk/.env, читливо само
// за displaymk корисникот под кого работи ова API.
//
// Истиот образец како во scripts/nightly.sh (таму преку curl/node -e, тука
// директно fetch бидејќи процесот е веќе Node).

const FROM = "Display.mk <info@display.mk>";

export async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY не е поставен");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body}`);
  }

  return res.json();
}
