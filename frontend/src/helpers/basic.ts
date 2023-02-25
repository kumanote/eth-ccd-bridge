export function noOp(): void {
    return undefined;
}

export function isDefined<T>(v?: T): v is T {
    return v !== undefined;
}
