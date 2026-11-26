module.exports = ({ config }) => {
  if (process.env.VENEER_PAGES !== '1') return config;

  return {
    ...config,
    experiments: { ...config.experiments, baseUrl: '/veneer-room-planner' },
  };
};
