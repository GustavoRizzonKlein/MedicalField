// OpenAPI document served by Swagger UI at /docs. Keep it in sync with routes.ts.

const error = { $ref: '#/components/schemas/Error' };
const unauthorized = { description: 'Missing or invalid token', content: { 'application/json': { schema: error } } };
const forbidden = { description: 'Only ADMIN', content: { 'application/json': { schema: error } } };
const limit = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'MedicalField Identity Service',
    description: 'Login (JWT RS256), professionals, access logs and offline client logs.',
    version: '1.0.0',
  },
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Professional: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          registryType: { type: 'string', example: 'COREN' },
          registryNumber: { type: 'string', example: 'SOC-0001' },
          role: { type: 'string', enum: ['ADMIN', 'RESPONDER'] },
        },
      },
      ClientLogEntry: {
        type: 'object',
        required: ['id', 'action', 'occurredAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          deviceId: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
          level: { type: 'string', example: 'INFO' },
          action: { type: 'string', example: 'ENCOUNTER_CREATED' },
          details: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: [{ bearer: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchanges registry number and password for a JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['registryNumber', 'password'],
                properties: {
                  registryNumber: { type: 'string', example: 'SOC-0001' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Signed token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    professional: { $ref: '#/components/schemas/Professional' },
                  },
                },
              },
            },
          },
          400: { description: 'registryNumber and password are required', content: { 'application/json': { schema: error } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: error } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Professional of the current token',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Professional' } } } },
          401: unauthorized,
          404: { description: 'Professional not found', content: { 'application/json': { schema: error } } },
        },
      },
    },
    '/professionals': {
      get: {
        tags: ['Professionals'],
        summary: 'Lists all professionals',
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Professional' } } } },
          },
          401: unauthorized,
        },
      },
    },
    '/logs': {
      post: {
        tags: ['Logs'],
        summary: 'Receives logs the client recorded offline (entries already received are ignored)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['entries'],
                properties: { entries: { type: 'array', items: { $ref: '#/components/schemas/ClientLogEntry' } } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Received',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { received: { type: 'integer' }, accepted: { type: 'integer' } } },
              },
            },
          },
          400: { description: 'entries must be an array', content: { 'application/json': { schema: error } } },
          401: unauthorized,
        },
      },
    },
    '/logs/client': {
      get: {
        tags: ['Logs'],
        summary: 'Offline client logs (ADMIN)',
        parameters: [limit],
        responses: { 200: { description: 'OK' }, 401: unauthorized, 403: forbidden },
      },
    },
    '/logs/access': {
      get: {
        tags: ['Logs'],
        summary: 'Access log of this service (ADMIN)',
        parameters: [limit],
        responses: { 200: { description: 'OK' }, 401: unauthorized, 403: forbidden },
      },
    },
  },
};
