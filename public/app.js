const form = document.querySelector('#attendance-form');
const submitButton = document.querySelector('#submit-button');
const buttonLabel = submitButton.querySelector('.button-label');
const statusBox = document.querySelector('#form-status');

let isSubmitting = false;
let submissionKey = null;

const messages = {
  fullName: 'يرجى كتابة الاسم الكامل (حرفان على الأقل).',
  whatsOrderPhone: 'يرجى إدخال رقم موبايل مصري صحيح.',
  activity: 'يرجى كتابة اسم أو نوع النشاط.',
  address: 'يرجى كتابة العنوان بالكامل (10 أحرف على الأقل).',
};

function toLatinDigits(value) {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizedLocalPhone(value) {
  return toLatinDigits(value)
    .replace(/\D/g, '')
    .replace(/^20/, '')
    .replace(/^0/, '');
}

function clearFeedback() {
  statusBox.className = 'form-status';
  statusBox.textContent = '';

  for (const field of form.elements) {
    if (!(field instanceof HTMLElement) || !field.name) {
      continue;
    }
    field.removeAttribute('aria-invalid');
    const error = document.querySelector(`#${field.name}-error`);
    if (error) {
      error.textContent = '';
    }
  }
}

function setFieldError(name) {
  const field = form.elements.namedItem(name);
  const error = document.querySelector(`#${name}-error`);
  if (field instanceof HTMLElement) {
    field.setAttribute('aria-invalid', 'true');
  }
  if (error) {
    error.textContent = messages[name];
  }
}

function validate(payload) {
  const invalidFields = [];

  if (payload.fullName.length < 2) invalidFields.push('fullName');
  if (!/^201[0125]\d{8}$/.test(payload.whatsOrderPhone)) {
    invalidFields.push('whatsOrderPhone');
  }
  if (payload.activity.length < 2) invalidFields.push('activity');
  if (payload.address.length < 10) invalidFields.push('address');

  return invalidFields;
}

function setLoading(loading) {
  isSubmitting = loading;
  submitButton.disabled = loading;
  submitButton.classList.toggle('loading', loading);
  buttonLabel.textContent = loading
    ? 'جارٍ تأكيد الحضور...'
    : 'تأكيد حضوري في التدريب';
  form.setAttribute('aria-busy', String(loading));
}

function showStatus(type, message) {
  statusBox.className = `form-status ${type}`;
  statusBox.textContent = message;
}

async function parseError(response) {
  try {
    const body = await response.json();
    if (Array.isArray(body?.error?.details)) {
      return 'يرجى مراجعة البيانات المدخلة والمحاولة مرة أخرى.';
    }
    if (typeof body?.error?.message === 'string') {
      return body.error.message;
    }
  } catch {
    // A non-JSON proxy response is handled by the generic message below.
  }
  return 'تعذر تأكيد الحضور الآن. يرجى المحاولة مرة أخرى.';
}

form.addEventListener('input', (event) => {
  if (
    !(event.target instanceof HTMLInputElement) &&
    !(event.target instanceof HTMLTextAreaElement)
  ) {
    return;
  }

  event.target.removeAttribute('aria-invalid');
  const error = document.querySelector(`#${event.target.name}-error`);
  if (error) {
    error.textContent = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  clearFeedback();

  const data = new FormData(form);
  const localPhone = normalizedLocalPhone(
    String(data.get('whatsOrderPhone') ?? ''),
  );
  const payload = {
    fullName: String(data.get('fullName') ?? '').trim(),
    whatsOrderPhone: `20${localPhone}`,
    activity: String(data.get('activity') ?? '').trim(),
    address: String(data.get('address') ?? '').trim(),
  };

  const invalidFields = validate(payload);
  if (invalidFields.length > 0) {
    invalidFields.forEach(setFieldError);
    const firstInvalid = form.elements.namedItem(invalidFields[0]);
    if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
    showStatus('error', 'يرجى استكمال البيانات المطلوبة بشكل صحيح.');
    return;
  }

  submissionKey ??= crypto.randomUUID();
  setLoading(true);

  try {
    const response = await fetch('/api/attendance-registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': submissionKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    form.reset();
    submissionKey = null;
    showStatus('success', 'تم تأكيد حضورك بنجاح. نتطلع لرؤيتك في التدريب!');
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.';
    showStatus('error', message);
  } finally {
    setLoading(false);
  }
});
