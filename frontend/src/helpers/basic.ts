export function noOp(): void {
    return undefined;
}

export function sleep(timeMS: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeMS);
    });
}
