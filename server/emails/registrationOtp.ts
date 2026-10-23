/** A self-contained transactional email: no remote images, fonts or scripts. */
function accountEmail(kind: 'registration' | 'password_reset' | 'password_changed', code = '') {
    const reset = kind === 'password_reset', changed = kind === 'password_changed';
    if (!changed && !/^\d{6}$/.test(code)) throw new Error('Account email requires a six-digit OTP.');
    const title = changed ? 'Mật khẩu đã được thay đổi' : reset ? 'Đặt lại mật khẩu của bạn' : 'Xác thực email của bạn';
    const intro = changed ? 'Mật khẩu tài khoản MugenBunko của bạn vừa được thay đổi. Các phiên đăng nhập cũ đã hết hiệu lực.' : reset ? 'Bạn vừa yêu cầu đặt lại mật khẩu. Dùng mã dưới đây để xác nhận yêu cầu và tạo mật khẩu mới.' : 'Dùng mã dưới đây để hoàn tất đăng ký MugenBunko và bắt đầu hành trình đọc của mình.';
    const instruction = changed ? 'Đăng nhập lại bằng mật khẩu mới để tiếp tục sử dụng tài khoản.' : `Quay lại màn hình ${reset ? 'khôi phục mật khẩu' : 'đăng ký'} để nhập mã.`;
    const unsolicited = changed ? 'Nếu không phải bạn thực hiện, hãy dùng chức năng Quên mật khẩu để khôi phục tài khoản ngay.' : reset ? 'Nếu không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này. Mật khẩu hiện tại vẫn được giữ nguyên.' : 'Nếu không phải bạn đăng ký, bạn có thể bỏ qua email này.';

    return {
        subject: changed ? 'MugenBunko — Mật khẩu đã được thay đổi' : reset ? 'MugenBunko — Mã khôi phục mật khẩu' : 'MugenBunko — Mã xác thực đăng ký',
        text: `MUGENBUNKO · ${title.toLocaleUpperCase('vi')}

Chào bạn,

${intro}

${changed ? '' : code + '\n\nMã có hiệu lực trong 5 phút.'}

${instruction}

${changed ? 'Giữ mật khẩu mới cho riêng bạn.' : 'Giữ mã này cho riêng bạn.'} MugenBunko không yêu cầu bạn cung cấp mã hoặc mật khẩu qua tin nhắn hoặc điện thoại.

${unsolicited}

MugenBunko
Đọc · Lưu giữ · Sáng tác`,
        html: `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${title} · MugenBunko</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-outer { padding: 20px 12px !important; }
      .email-header { padding: 26px 24px !important; }
      .email-content { padding: 32px 24px !important; }
      .email-title { font-size: 28px !important; }
      .email-code { font-size: 36px !important; letter-spacing: 6px !important; }
      .email-code-panel { padding: 24px 12px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; width:100%; background-color:#f2efe9; color:#2a2e30; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; font-size:1px; line-height:1px; color:#f2efe9; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">${changed ? 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại bằng mật khẩu mới.' : reset ? 'Mã khôi phục mật khẩu MugenBunko có hiệu lực trong 5 phút.' : 'Hoàn tất đăng ký MugenBunko. Mã xác thực của bạn có hiệu lực trong 5 phút.'}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f2efe9" style="width:100%; border-collapse:collapse; background-color:#f2efe9;">
    <tr><td class="email-outer" align="center" style="padding:48px 20px;">
      <!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:560px; border-collapse:separate; border-spacing:0;">
        <tr><td class="email-header" bgcolor="#1c2d37" style="padding:30px 40px; background-color:#1c2d37; border-radius:12px 12px 0 0; border-bottom:3px solid #e05275;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse;">
            <tr>
              <td valign="middle">
                <p lang="ja" style="margin:0 0 7px; font-family:'Yu Mincho','MS Mincho','Times New Roman',serif; font-size:25px; line-height:1.4; letter-spacing:5px; color:#fffdf9;">無限文庫</p>
                <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; font-weight:bold; line-height:1.5; letter-spacing:3px; color:#e6d9c5;">MUGENBUNKO</p>
              </td>
              <td align="right" valign="middle" width="52" aria-hidden="true">
                <table role="presentation" width="40" cellspacing="0" cellpadding="0" border="0" style="width:40px; border-collapse:separate; border:1px solid #aa7b83; border-radius:4px;"><tr><td align="center" lang="ja" style="padding:7px 0; font-family:'Yu Mincho','MS Mincho',serif; font-size:21px; line-height:1.2; color:#f2b7c6;">栞</td></tr></table>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td class="email-content" bgcolor="#fffdf9" style="padding:40px; background-color:#fffdf9; border-right:1px solid #e6dfd3; border-bottom:1px solid #e6dfd3; border-left:1px solid #e6dfd3; border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px; font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:bold; line-height:1.6; letter-spacing:2px; color:#9b3a55;">${kind === 'registration' ? 'MỘT TRANG SÁCH MỚI' : 'BẢO MẬT TÀI KHOẢN'}</p>
          <h1 class="email-title" style="margin:0 0 16px; font-family:'Times New Roman',Times,serif; font-size:32px; font-weight:bold; line-height:1.25; color:#1c2d37;">${title}</h1>
          <p style="margin:0 0 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.8; color:#586064;">Chào bạn,<br>${intro}</p>
          ${changed ? '' : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:separate; border-spacing:0;">
            <tr><td class="email-code-panel" align="center" bgcolor="#f5f0e7" style="padding:28px 20px; background-color:#f5f0e7; border:1px solid #e6ddce; border-radius:8px;">
              <p style="margin:0 0 14px; font-family:Arial,Helvetica,sans-serif; font-size:10px; font-weight:bold; line-height:1.6; letter-spacing:1.5px; color:#64635e;">MÃ XÁC THỰC CỦA BẠN</p>
              <p class="email-code" translate="no" style="margin:0 0 14px; font-family:'Courier New',Courier,monospace; font-size:42px; font-weight:bold; line-height:1.2; letter-spacing:8px; text-align:center; white-space:nowrap; color:#1c2d37;">${code}</p>
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.7; color:#64635e;">Có hiệu lực trong <strong style="color:#1c2d37;">5 phút</strong></p>
            </td></tr>
          </table>`}
          <p style="margin:16px 0 28px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.8; text-align:center; color:#64635e;">${instruction}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:2px 0 2px 16px; border-left:2px solid #e05275;">
              <p style="margin:0 0 5px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:bold; line-height:1.7; color:#2a2e30;">${changed ? 'Giữ mật khẩu mới cho riêng bạn.' : 'Giữ mã này cho riêng bạn.'}</p>
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.8; color:#64635e;">MugenBunko không yêu cầu bạn cung cấp mã hoặc mật khẩu qua tin nhắn hoặc điện thoại.</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; margin-top:28px;">
            <tr><td style="padding-top:22px; border-top:1px solid #e6dfd3;">
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.9; color:#64635e;">${unsolicited}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:24px 12px 0;">
          <p style="margin:0 0 6px; font-family:Arial,Helvetica,sans-serif; font-size:11px; font-weight:bold; line-height:1.6; letter-spacing:1.5px; color:#586064;">MUGENBUNKO</p>
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.8; color:#64635e;">Đọc &nbsp;·&nbsp; Lưu giữ &nbsp;·&nbsp; Sáng tác</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`
    };
}

export const registrationOtpEmail = (code: string) => accountEmail('registration', code);
export const passwordResetOtpEmail = (code: string) => accountEmail('password_reset', code);
export const passwordChangedEmail = () => accountEmail('password_changed');
