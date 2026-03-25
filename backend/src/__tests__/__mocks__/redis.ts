export const redis = {
  get:    jest.fn() as jest.Mock,
  set:    jest.fn() as jest.Mock,
  hset:   jest.fn() as jest.Mock,
  expire: jest.fn() as jest.Mock,
  del:    jest.fn() as jest.Mock,
  incr:   jest.fn() as jest.Mock,
};
