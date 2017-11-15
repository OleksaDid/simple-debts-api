export class SendUserDto {
    id: string;
    name: string;
    picture: string;

    constructor(id: string, name: string, picture: string) {
        this.id = id;
        this.name = name;
        this.picture = picture;
    }
}

export class UpdateUserDataDto {
    name: string;
    picture?: string;

    constructor(name: string, picture?: string) {
        this.name = name;

        if(picture) {
            this.picture = picture;
        }
    }
}

export class CreateVirtualUserDto {
    name: string;
    virtual: boolean;

    constructor(name: string) {
        this.name = name;
        this.virtual = true;
    }
}