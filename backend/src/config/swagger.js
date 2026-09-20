const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cross-Border Racehorse Transport Management API (CBRT-2026)',
      version: '1.0.0',
      description: 'RESTful API Documentation for CBRT-2026 System (Logistics, Compliance, Tracking, SOS & Welfare)',
      contact: {
        name: 'CBRT Developer Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '66e5f1b2c3d4e5f6a7b8c9d0' },
            fullName: { type: 'string', example: 'Alex Manager' },
            email: { type: 'string', example: 'manager@cbrt.com' },
            role: {
              type: 'string',
              enum: ['LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'FLEET_COORDINATOR', 'DRIVER', 'ESCORT', 'CUSTOMER'],
              example: 'LOGISTICS_MANAGER'
            },
            phone: { type: 'string', example: '+1 555-0192' }
          }
        },
        Horse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '66e5f1b2c3d4e5f6a7b8c9d1' },
            name: { type: 'string', example: 'Thunderbolt Star' },
            microchipId: { type: 'string', example: '985141000123456' },
            feiPassportNo: { type: 'string', example: 'FEI-2026-US-8891' },
            breed: { type: 'string', example: 'Thoroughbred' },
            age: { type: 'number', example: 5 },
            weight: { type: 'number', example: 520 },
            medicalHistory: { type: 'string', example: 'Vaccinated for Influenza, Coggins negative' },
            ownerId: { type: 'string', example: '66e5f1b2c3d4e5f6a7b8c9d0' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderCode: { type: 'string', example: 'TR-2026-0001' },
            customerId: { type: 'string' },
            origin: { type: 'string', example: 'Kenting Racecourse, SG' },
            destination: { type: 'string', example: 'Chiba Equestrian Club, JP' },
            horses: { type: 'array', items: { type: 'string' } },
            status: {
              type: 'string',
              enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING', 'COMPLETED'],
              example: 'APPROVED'
            }
          }
        },
        TransportRoute: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderId: { type: 'string' },
            vehicleId: { type: 'string', example: 'TRUCK-STALL-04' },
            driverId: { type: 'string' },
            waypoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  locationName: { type: 'string', example: 'Changi Airport Cargo Terminal' },
                  type: { type: 'string', enum: ['PICKUP', 'REST_STOP', 'BORDER_CUSTOMS', 'DELIVERY'] },
                  status: { type: 'string', enum: ['PENDING', 'ARRIVED', 'DEPARTED'] }
                }
              }
            },
            currentLocation: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'Point' },
                coordinates: { type: 'array', items: { type: 'number' }, example: [103.9915, 1.3644] }
              }
            }
          }
        },
        HealthLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderId: { type: 'string' },
            horseId: { type: 'string' },
            temperature: { type: 'number', example: 38.2 },
            waterIntakeLiters: { type: 'number', example: 12.5 },
            stressLevel: { type: 'string', enum: ['STABLE', 'STRESSED', 'FEVER', 'INJURED'], example: 'STABLE' },
            notes: { type: 'string', example: 'Horse is calm and drinking water normally' }
          }
        },
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderId: { type: 'string' },
            driverId: { type: 'string' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_SOS'], example: 'CRITICAL_SOS' },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], example: 'OPEN' },
            description: { type: 'string', example: 'Vehicle tire puncture near Border Checkpoint' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger UI documentation available at: http://localhost:5000/api-docs');
};

module.exports = setupSwagger;
