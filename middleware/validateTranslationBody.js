// middleware/validateTranslationBody.js
export default function validateTranslationBody(request, reply, done) {
  const { texts, targetLang } = request.body || {};
  if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLang) {
    reply.code(400).send({ success: false, error: 'Texts and target language are required.' });
    return;
  }
  done();
}
