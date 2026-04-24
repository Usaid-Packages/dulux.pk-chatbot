import type { Page } from '@playwright/test';

interface LoginInput {
  email: string;
  password: string;
}

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('login');
  }

  async login({ email, password }: LoginInput): Promise<void> {
    await this.page.getByRole('textbox', { name: /^Email/ }).fill(email);
    await this.page.getByPlaceholder('Enter your password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
