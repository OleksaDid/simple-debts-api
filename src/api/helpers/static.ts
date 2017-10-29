export class StaticHelper {

    static getImagesPath(req): string {
        return req.protocol + '://' + req.get('host') + '/images/';
    }
}