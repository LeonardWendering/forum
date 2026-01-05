import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getStatus() {
    return {
      ok: true,
      service: "forum-api",
      timestamp: new Date().toISOString()
    };
  }
}
