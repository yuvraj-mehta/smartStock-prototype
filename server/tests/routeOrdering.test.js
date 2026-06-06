import itemRouter from '../routes/item.route.js';
import packageRouter from '../routes/package.route.js';
import salesRouter from '../routes/sales.route.js';
import transportRouter from '../routes/transport.route.js';

const routePathsForMethod = (router, method) => router.stack
  .filter((layer) => layer.route?.methods?.[method])
  .map((layer) => layer.route.path);

const expectBefore = (paths, specificRoute, parameterRoute) => {
  expect(paths).toContain(specificRoute);
  expect(paths).toContain(parameterRoute);
  expect(paths.indexOf(specificRoute)).toBeLessThan(paths.indexOf(parameterRoute));
};

describe('route ordering contracts', () => {
  it('keeps item-specific GET routes before the broad item id route', () => {
    const paths = routePathsForMethod(itemRouter, 'get');

    expectBefore(paths, '/batch/:batchId', '/:id');
    expectBefore(paths, '/track/:serialNumber', '/:id');
    expectBefore(paths, '/product/:productId/movement-history', '/:id');
  });

  it('keeps package order lookup before the broad package id route', () => {
    const paths = routePathsForMethod(packageRouter, 'get');

    expectBefore(paths, '/order/:orderId', '/:packageId');
  });

  it('keeps transport package lookup before the broad transport id route', () => {
    const paths = routePathsForMethod(transportRouter, 'get');

    expectBefore(paths, '/package/:packageId', '/:transportId');
  });

  it('keeps sales package lookup before the broad sales id route', () => {
    const paths = routePathsForMethod(salesRouter, 'get');

    expectBefore(paths, '/package/:packageId', '/:id');
  });
});
