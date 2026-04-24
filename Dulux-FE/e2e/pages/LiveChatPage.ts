import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class LiveChatPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('complaints');
  }

  async gotoThread(threadId: string): Promise<void> {
    await this.page.goto(`complaints/${threadId}`);
  }

  async expectThreadPath(threadId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/complaints/${threadId}(?:\\?.*)?$`));
  }

  async expectTicketHeading(threadId: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: `Ticket #${threadId}` })).toBeVisible();
  }

  async sendMessage(text: string): Promise<void> {
    await this.page.getByLabel('Message input').fill(text);
    await this.page.getByRole('button', { name: 'Send Message' }).click();
  }

  async submitEmptyMessage(): Promise<void> {
    await this.page.getByRole('button', { name: 'Send Message' }).click();
  }

  async openResolveModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Mark as Resolved' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Mark Complaint as Resolved' })).toBeVisible();
  }

  async resolveConversation(closureNote: string): Promise<void> {
    await this.page.getByLabel('Closure Note (Optional)').fill(closureNote);
    await this.page.getByRole('button', { name: 'Resolve & Close' }).click();
  }
}
