import settingService from './setting-service';

const webhookService = {

	async sendEmailToWebhook({ env }, emailRow) {

		const { webhookUrl, webhookBody, webhookStatus } = await settingService.query({ env });

		if (webhookStatus !== 0 || !webhookUrl) {
			return;
		}

		if (!webhookBody) {
			console.error('Webhook body is empty, skipping');
			return;
		}

		// 替换模板变量
		const body = webhookBody
			.replace(/\[from\]/g, emailRow.sendEmail || '')
			.replace(/\[title\]/g, emailRow.subject || '')
			.replace(/\[content\]/g, emailRow.text || emailRow.content || '')
			.replace(/\[to\]/g, emailRow.toEmail || '');

		try {
			const res = await fetch(webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: body
			});

			if (!res.ok) {
				console.error(`Webhook 发送失败 status: ${res.status} response: ${await res.text()}`);
			} else {
				console.log('Webhook 发送成功');
			}
		} catch (e) {
			console.error('Webhook 发送失败:', e.message);
		}
	}

}

export default webhookService;
