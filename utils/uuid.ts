import { v5 as uuidv5 } from 'uuid';


export function deterministicUuid(value: string) {
    const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // use any namespace you want
    return uuidv5(value, NAMESPACE);
}