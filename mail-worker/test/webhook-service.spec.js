import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the setting service
vi.mock('../src/service/setting-service', () => ({
	default: {
		query: vi.fn()
	}
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('webhook-service', () => {

	let webhookService;
	let settingService;

	beforeEach(async () => {
		vi.clearAllMocks();
		settingService = await import('../src/service/setting-service');
		webhookService = (await import('../src/service/webhook-service')).default;
	});

	describe('sendEmailToWebhook', () => {

		it('should not send webhook when status is CLOSE', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '{"from":"[from]"}',
				webhookStatus: 1 // CLOSE
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'test@example.com',
				subject: 'Test Subject',
				text: 'Test content'
			};

			await webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not send webhook when url is empty', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: '',
				webhookBody: '{"from":"[from]"}',
				webhookStatus: 0 // OPEN
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'test@example.com',
				subject: 'Test Subject',
				text: 'Test content'
			};

			await webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not send webhook when body is empty', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '',
				webhookStatus: 0 // OPEN
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'test@example.com',
				subject: 'Test Subject',
				text: 'Test content'
			};

			await webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should send webhook with replaced template variables', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '{"from":"[from]","title":"[title]","content":"[content]"}',
				webhookStatus: 0 // OPEN
			});

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('OK')
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'sender@example.com',
				subject: 'Hello World',
				text: 'Email body text'
			};

			await webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith(
				'https://example.com/webhook',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: '{"from":"sender@example.com","title":"Hello World","content":"Email body text"}'
				})
			);
		});

		it('should send webhook with html content when text is empty', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '{"from":"[from]","content":"[content]"}',
				webhookStatus: 0 // OPEN
			});

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('OK')
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'sender@example.com',
				subject: 'Test',
				text: '',
				content: '<p>HTML content</p>'
			};

			await webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://example.com/webhook',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: '{"from":"sender@example.com","content":"<p>HTML content</p>"}'
				})
			);
		});

		it('should handle fetch error gracefully', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '{"from":"[from]"}',
				webhookStatus: 0 // OPEN
			});

			mockFetch.mockRejectedValue(new Error('Network error'));

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'test@example.com',
				subject: 'Test',
				text: 'Test content'
			};

			// Should not throw
			await expect(webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow)).resolves.toBeUndefined();
		});

		it('should handle non-ok response', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '{"from":"[from]"}',
				webhookStatus: 0 // OPEN
			});

			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				text: () => Promise.resolve('Internal Server Error')
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: 'test@example.com',
				subject: 'Test',
				text: 'Test content'
			};

			// Should not throw, just log error
			await expect(webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow)).resolves.toBeUndefined();
		});

		it('should handle missing email fields gracefully', async () => {
			settingService.default.query.mockResolvedValue({
				webhookUrl: 'https://example.com/webhook',
				webhookBody: '{"from":"[from]","title":"[title]","content":"[content]"}',
				webhookStatus: 0 // OPEN
			});

			mockFetch.mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('OK')
			});

			const mockEnv = {};
			const emailRow = {
				sendEmail: '',
				subject: '',
				text: ''
			};

			await webhookService.sendEmailToWebhook({ env: mockEnv }, emailRow);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://example.com/webhook',
				expect.objectContaining({
					body: '{"from":"","title":"","content":""}'
				})
			);
		});

	});

});
