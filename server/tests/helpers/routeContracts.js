export const expectHealthContract = (body) => {
  expect(body).toEqual(
    expect.objectContaining({
      status: 'healthy',
      service: 'smartstock-api',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      memory: expect.objectContaining({
        rss: expect.any(String),
        heapUsed: expect.any(String),
        heapTotal: expect.any(String),
      }),
      readiness: expect.objectContaining({
        ready: expect.any(Boolean),
        checks: expect.objectContaining({
          database: expect.objectContaining({
            status: expect.stringMatching(/^(ready|not_ready)$/),
            connected: expect.any(Boolean),
            readyState: expect.any(Number),
            state: expect.any(String),
          }),
          config: expect.objectContaining({
            status: expect.stringMatching(/^(ready|not_ready)$/),
            required: expect.objectContaining({
              valid: expect.any(Boolean),
              missing: expect.any(Array),
            }),
          }),
        }),
      }),
    }),
  );
};

export const expectReadinessContract = (body) => {
  expect(body).toEqual(
    expect.objectContaining({
      status: expect.stringMatching(/^(ready|not_ready)$/),
      service: 'smartstock-api',
      timestamp: expect.any(String),
      readiness: expect.objectContaining({
        ready: expect.any(Boolean),
        checks: expect.objectContaining({
          database: expect.any(Object),
          config: expect.any(Object),
        }),
      }),
    }),
  );
};

export const expectProductionHealthContract = (body) => {
  expect(body).toEqual(
    expect.objectContaining({
      status: 'healthy',
      service: 'smartstock-api',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      ready: expect.any(Boolean),
    }),
  );
  expect(body).not.toHaveProperty('memory');
  expect(body).not.toHaveProperty('readiness');
};

export const expectProductionReadinessContract = (body) => {
  expect(body).toEqual(
    expect.objectContaining({
      status: expect.stringMatching(/^(ready|not_ready)$/),
      service: 'smartstock-api',
      timestamp: expect.any(String),
      ready: expect.any(Boolean),
    }),
  );
  expect(body).not.toHaveProperty('readiness');
};
