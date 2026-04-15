export function serializePrisma<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializePrisma(item)) as unknown as T;
  }

  if (data instanceof Date) {
    return data;
  }

  if (
    typeof data === "object" && 
    data !== null && 
    "toNumber" in data && 
    typeof (data as any).toNumber === "function"
  ) {
    return (data as any).toNumber();
  }

  if (typeof data === "object" && data !== null) {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializePrisma((data as any)[key]);
      }
    }
    return serialized as T;
  }

  return data;
}
