import { Id } from '../../common/types';

export interface JwtPayloadInterface {
    id: Id;
    exp: number;
    jwtid: number;
}