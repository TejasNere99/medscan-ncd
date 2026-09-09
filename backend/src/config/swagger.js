export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'AI-Based IoT Smart Healthcare Platform API',
    version: '1.0.0',
    description:
      'Full API documentation for medicine reminders, AI disease prediction, OCR lab report parsing, population analytics, and IoT device synchronization.',
    contact: {
      name: 'System Support',
      email: 'support@aismarthealth.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health Check Endpoint',
        responses: {
          200: {
            description: 'API Server is running clean',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate User & Obtain JWT Tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'patient@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/iot/medicine-status': {
      post: {
        summary: 'IoT ESP32 Device Log Update Endpoint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  deviceId: { type: 'string', example: 'ESP32_DEV_001' },
                  patientId: { type: 'string' },
                  medicineId: { type: 'string' },
                  status: { type: 'string', example: 'Taken' },
                  timestamp: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
        },
      },
    },
  },
};
