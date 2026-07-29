import { pick } from "../../random/rng.js";
import { log } from "../helpers.js";
export function rollWeather(state) { return pick(state.config.weather.faces, state.rng.streams.weather); }
export function setSummitForecast(state) {
    if (state.phase !== "setup.preparedSelection")
        throw new Error("The Summit forecast can only be rolled during hidden-plan setup.");
    if (state.weather.forecast)
        return state.weather.forecast;
    state.weather.forecast = rollWeather(state);
    state.weather.forecastDie = "B";
    state.weather.currentDie = "A";
    log(state, "weather.summitForecast", `The public pre-Summit Forecast is ${state.weather.forecast}.`);
    return state.weather.forecast;
}
export function setInitialCurrent(state) {
    if (state.phase !== "setup.rollCurrent")
        throw new Error("Current Condition can only be rolled after the opening plans are resolved.");
    state.weather.current = rollWeather(state);
    state.weather.currentDie = "A";
    state.weather.forecastDie = "B";
    state.phase = state.weather.forecast ? "generation.start" : "setup.rollForecast";
    log(state, "weather.current", `Initial Current Condition is ${state.weather.current}.`);
}
export function setInitialForecast(state) {
    if (state.phase !== "setup.rollForecast")
        throw new Error("Forecast can only be rolled after the Current Condition.");
    state.weather.forecast = rollWeather(state);
    state.phase = "generation.start";
    log(state, "weather.forecast", `Generation 1 Forecast is ${state.weather.forecast}.`);
}
export function advanceWeather(state) {
    if (state.phase !== "generation.advanceWeather")
        throw new Error("Weather cannot advance in this phase.");
    if (state.generation >= 8)
        throw new Error("There is no weather after Generation 8.");
    const oldCurrentDie = state.weather.currentDie;
    state.weather.current = state.weather.forecast;
    state.weather.currentDie = state.weather.forecastDie;
    state.weather.history[state.generation + 1] = state.weather.current;
    if (state.generation === 7) {
        state.weather.forecast = null;
        state.weather.forecastDie = oldCurrentDie;
    }
    else {
        state.weather.forecastDie = oldCurrentDie;
        state.weather.forecast = rollWeather(state);
    }
    state.generation += 1;
    state.phase = "generation.start";
    log(state, "weather.advanced", `Forecast became Current for Generation ${state.generation}.`, null, { current: state.weather.current, forecast: state.weather.forecast });
}
//# sourceMappingURL=weather.js.map