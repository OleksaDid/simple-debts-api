"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SendUserDto {
    constructor(id, name, picture) {
        this.id = id;
        this.name = name;
        this.picture = picture;
    }
}
exports.SendUserDto = SendUserDto;
class UpdateUserDataDto {
    constructor(name, picture) {
        this.name = name;
        if (picture) {
            this.picture = picture;
        }
    }
}
exports.UpdateUserDataDto = UpdateUserDataDto;
class CreateVirtualUserDto {
    constructor(name) {
        this.name = name;
        this.virtual = true;
    }
}
exports.CreateVirtualUserDto = CreateVirtualUserDto;
//# sourceMappingURL=user.dto.js.map