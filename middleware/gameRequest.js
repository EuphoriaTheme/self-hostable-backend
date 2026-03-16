export default function validateGameRequest(request, reply, done) {
  const { game, ip, port } = request.params || {};

  if (!game || !ip || !port) {
    reply.code(400).send({ success: false, error: 'Invalid parameters' });
    return;
  }

  done(); // Proceed to the next preHandler or route handler
}