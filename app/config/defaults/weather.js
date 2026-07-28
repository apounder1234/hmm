const faces = ["brightSun", "brightSun", "rain", "strongWind", "storm", "calmOvercast"];
export const weather = {
    faces,
    solar: {
        brightSun: [0, 1, 2, 3, 4, 5], rain: [0, 0, 1, 1, 2, 2], strongWind: [0, 0, 1, 1, 2, 2], storm: [0, 0, 0, 1, 1, 1], calmOvercast: [0, 0, 1, 1, 2, 2]
    },
    wind: {
        brightSun: [0, 0, 1, 1, 2, 2], rain: [0, 0, 1, 1, 2, 2], strongWind: [0, 1, 2, 3, 4, 5], storm: [0, 1, 2, 3, 3, 4], calmOvercast: [0, 0, 1, 1, 2, 2]
    },
    hydro: {
        brightSun: [0, 1, 2, 2, 2, 2], rain: [0, 1, 2, 2, 3, 3], strongWind: [0, 1, 2, 2, 2, 2], storm: [0, 1, 2, 3, 4, 5], calmOvercast: [0, 1, 2, 2, 2, 2]
    }
};
//# sourceMappingURL=weather.js.map