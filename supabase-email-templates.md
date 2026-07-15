# Supabase Auth Email Templates — AquaGas

Paste each block into Authentication → Emails → Templates → (matching tab) → Message body, in the Supabase dashboard.
Supabase strips `<style>` tags in some renderers, so all styling is inline. Available variables per template are noted above each block.

---

## Confirm sign up
Variables: `{{ .ConfirmationURL }}`

```html
<div style="background:#0a0a0a;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Confirm your email</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Welcome to AquaGas. Please confirm your email address to activate your account.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
      Confirm email
    </a>
    <p style="color:#525252;font-size:12px;line-height:1.6;margin:24px 0 0;">
      If you didn't create an AquaGas account, you can safely ignore this email.
    </p>
  </div>
</div>
```

---

## Invite user
Variables: `{{ .ConfirmationURL }}`

```html
<div style="background:#0a0a0a;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px;">You've been invited to AquaGas</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      An account has been created for you. Click below to set your password and get started.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
      Accept invite
    </a>
    <p style="color:#525252;font-size:12px;line-height:1.6;margin:24px 0 0;">
      If you weren't expecting this invite, you can ignore this email.
    </p>
  </div>
</div>
```

---

## Magic link or OTP
Variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`

```html
<div style="background:#0a0a0a;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Sign in to AquaGas</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to sign in, or use the one-time code.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
      Sign in
    </a>
    <p style="color:#a3a3a3;font-size:13px;margin:24px 0 4px;">Or enter this code:</p>
    <div style="background:#1f1f1f;border:1px solid #262626;border-radius:8px;padding:12px;text-align:center;letter-spacing:4px;font-size:22px;font-weight:700;color:#ffffff;">
      {{ .Token }}
    </div>
    <p style="color:#525252;font-size:12px;line-height:1.6;margin:24px 0 0;">
      This code and link expire shortly. If you didn't request this, ignore this email.
    </p>
  </div>
</div>
```

---

## Change email address
Variables: `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`

```html
<div style="background:#0a0a0a;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Confirm your new email</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Please confirm that <strong style="color:#e5e5e5;">{{ .NewEmail }}</strong> is your new email address for AquaGas.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
      Confirm new email
    </a>
    <p style="color:#525252;font-size:12px;line-height:1.6;margin:24px 0 0;">
      If you didn't request this change, please secure your account or contact support.
    </p>
  </div>
</div>
```

---

## Reset password
Variables: `{{ .ConfirmationURL }}`

```html
<div style="background:#0a0a0a;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Reset your password</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      We received a request to reset your AquaGas password. Click below to choose a new one.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
      Reset password
    </a>
    <p style="color:#525252;font-size:12px;line-height:1.6;margin:24px 0 0;">
      If you didn't request a password reset, you can safely ignore this email — your password won't change.
    </p>
  </div>
</div>
```

---

## Reauthentication
Variables: `{{ .Token }}`

```html
<div style="background:#0a0a0a;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Confirm it's you</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
      For your security, please enter this code to continue with your AquaGas sensitive action.
    </p>
    <div style="background:#1f1f1f;border:1px solid #262626;border-radius:8px;padding:12px;text-align:center;letter-spacing:4px;font-size:22px;font-weight:700;color:#ffffff;">
      {{ .Token }}
    </div>
    <p style="color:#525252;font-size:12px;line-height:1.6;margin:24px 0 0;">
      If you didn't initiate this action, please secure your account immediately.
    </p>
  </div>
</div>
```
