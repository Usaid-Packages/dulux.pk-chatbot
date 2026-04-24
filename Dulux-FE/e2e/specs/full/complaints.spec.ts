import { authStatePaths } from '../../fixtures/auth.fixture';
import { expect, test } from '../../fixtures/data.fixture';
import {
  emitComplaintThreadSocketMessage,
  forceComplaintThreadSocketDisconnect,
  getComplaintThreadSocketCount,
  installControlledComplaintsSocketMocks,
  setComplaintSocketSendFailureEnabled,
} from '../../mocks/complaintsSocket.mock';
import { LiveChatPage } from '../../pages/LiveChatPage';

test.describe('@critical @chat complaints realtime phase3', () => {
  test.use({ storageState: authStatePaths.cs });

  test('CHAT-001 conversation list auto-selects first thread and deep-link thread opens', async ({ page }) => {
    const liveChatPage = new LiveChatPage(page);

    await liveChatPage.goto();
    await liveChatPage.expectThreadPath('cmp-1');
    await liveChatPage.expectTicketHeading('cmp-1');

    await liveChatPage.gotoThread('cmp-2');
    await liveChatPage.expectThreadPath('cmp-2');
    await liveChatPage.expectTicketHeading('cmp-2');
  });

  test('CHAT-002 incoming socket message appears without page reload', async ({ page }) => {
    await installControlledComplaintsSocketMocks(page);

    const liveChatPage = new LiveChatPage(page);
    await liveChatPage.gotoThread('cmp-1');
    await liveChatPage.expectTicketHeading('cmp-1');

    await emitComplaintThreadSocketMessage(page, 'cmp-1', {
      id: 'socket-customer-1',
      sender: 'CUSTOMER',
      text: 'Incoming websocket update from customer.',
      created: '2026-04-24T10:00:00Z',
    });

    await expect(page.getByText('Incoming websocket update from customer.')).toBeVisible();
    await liveChatPage.expectThreadPath('cmp-1');
  });

  test('CHAT-003 resolve flow performs OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED with closure note', async ({
    page,
  }) => {
    const capturedActions: string[] = [];
    let closeActionPayload: Record<string, unknown> | null = null;

    await page.route(/.*\/api\/v1\/complaints\/[^/]+\/?(?:\?.*)?$/, async route => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON() as Record<string, unknown>;
        const action = typeof payload.action === 'string' ? payload.action : '';
        capturedActions.push(action);

        if (action === 'CLOSE') {
          closeActionPayload = payload;
        }
      }
      await route.fallback();
    });

    const liveChatPage = new LiveChatPage(page);
    await liveChatPage.gotoThread('cmp-1');
    await liveChatPage.expectTicketHeading('cmp-1');

    await expect.poll(() => capturedActions.includes('ASSIGN')).toBeTruthy();

    await liveChatPage.openResolveModal();
    await liveChatPage.resolveConversation('Resolved after customer confirmation.');

    await expect(page.getByText('Complaint closed successfully.')).toBeVisible();
    await expect(page.getByText('Conversation is resolved.')).toBeVisible();
    expect(capturedActions).toEqual(expect.arrayContaining(['RESOLVE', 'CLOSE']));
    expect(closeActionPayload?.closure_note).toBe('Resolved after customer confirmation.');
  });

  test('CHAT-004 message send path validates empty/trimmed input and handles transport errors', async ({ page }) => {
    await installControlledComplaintsSocketMocks(page);

    const liveChatPage = new LiveChatPage(page);
    await liveChatPage.gotoThread('cmp-1');

    await liveChatPage.submitEmptyMessage();
    await expect(page.getByText('Message is required.')).toBeVisible();

    await liveChatPage.sendMessage('   Trimmed outbound message   ');
    await expect(page.getByText('Trimmed outbound message')).toBeVisible();

    await setComplaintSocketSendFailureEnabled(page, true);
    await liveChatPage.sendMessage('Delivery failure simulation');
    await expect(page.getByText('Message delivery failed from controlled socket mock.')).toBeVisible();
  });

  test('HARD-004 disconnect/reconnect path shows feedback and recovers sending', async ({ page }) => {
    await installControlledComplaintsSocketMocks(page);

    const liveChatPage = new LiveChatPage(page);
    await liveChatPage.gotoThread('cmp-1');

    await forceComplaintThreadSocketDisconnect(page, 'cmp-1', 1006, 'phase3-disconnect-test');
    await liveChatPage.sendMessage('Send while disconnected');
    await expect(page.getByText('Chat socket is disconnected. Please wait and try again.')).toBeVisible();

    await expect.poll(async () => getComplaintThreadSocketCount(page, 'cmp-1'), { timeout: 8_000 }).toBeGreaterThan(0);

    await liveChatPage.sendMessage('Message after reconnect');
    await expect(page.getByText('Message after reconnect')).toBeVisible();
  });
});
