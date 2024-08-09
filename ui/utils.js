export async function svg(url) {
    const data = await fetch(SOURCE + url);
    return await data.text();
}

export function debounce(lambda, debounceTimeInMillis = 500) {
    let timerId;
    return function (...vars) {
        if (timerId) {
            clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
            lambda(...vars);
        }, debounceTimeInMillis);
        return true;
    };
}

export const NablaStorage = (() => {
    const namespace = "nabla.js";
    return {
        getItem: key => {
            const ls = localStorage.getItem(namespace);
            return !ls ? ls : JSON.parse(ls)[key];
        },
        setItem: (key, value) => {
            const ls = JSON.parse(localStorage.getItem(namespace)) || {};
            ls[key] = value;
            localStorage.setItem(namespace, JSON.stringify(ls));
            return this;
        }
    };
})();

export function useState(defaultState) {
    let state = defaultState;
    let onChangeLambda = [];
    const onChange = lambda => {
        onChangeLambda.push(lambda);
    }
    const setState = lambda => {
        const newPartialState = lambda(state);
        state = { ...state, ...newPartialState };
        onChangeLambda.forEach(func => {
            func(state)
        });
    }

    const getState = () => state;

    return [getState, setState, onChange];
}