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
class CloneRealUserToVirtualDto {
    constructor(name, picture) {
        this.virtual = true;
        this.name = name + ' BOT';
        this.picture = picture;
    }
}
exports.CloneRealUserToVirtualDto = CloneRealUserToVirtualDto;
//# sourceMappingURL=user.dto.js.map