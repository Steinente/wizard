export const shuffleArray = (input, random = Math.random) => {
    const copy = [...input];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        const current = copy[index];
        copy[index] = copy[swapIndex];
        copy[swapIndex] = current;
    }
    return copy;
};
//# sourceMappingURL=random.js.map