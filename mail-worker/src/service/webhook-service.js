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
		// 使用 JSON.stringify 将 content 正确转义后再替换，避免特殊字符破坏 JSON
		const escapeForJson = (str) => {
			const jsonStr = JSON.stringify(str);
			return jsonStr.slice(1, -1); // 去掉首尾的引号
		};

		const body = webhookBody
			.replace(/\[from\]/g, emailRow.sendEmail || '')
			.replace(/\[title\]/g, emailRow.subject || '')
			.replace(/\[to\]/g, emailRow.toEmail || '')
			.replace(/\[content\]/g, escapeForJson(emailRow.text || emailRow.content || ''));

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
