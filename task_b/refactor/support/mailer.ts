export type SentMail = { to: string; subject: string };

class Mailer {
  sent: SentMail[] = [];
  queued: SentMail[] = [];
  failNextSend = false;

  async sendNow(to: string, subject: string): Promise<void> {
    if (this.failNextSend) {
      this.failNextSend = false;
      throw new Error("mail provider timed out");
    }
    this.sent.push({ to, subject });
  }

  enqueue(to: string, subject: string): void {
    this.queued.push({ to, subject });
  }
}

export let mailer = new Mailer();

export function resetMailer(): Mailer {
  mailer = new Mailer();
  return mailer;
}
