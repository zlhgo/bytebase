/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "bytebase.store";

export enum IdentityProviderType {
  IDENTITY_PROVIDER_TYPE_UNSPECIFIED = 0,
  OAUTH2 = 1,
  OIDC = 2,
  UNRECOGNIZED = -1,
}

export function identityProviderTypeFromJSON(object: any): IdentityProviderType {
  switch (object) {
    case 0:
    case "IDENTITY_PROVIDER_TYPE_UNSPECIFIED":
      return IdentityProviderType.IDENTITY_PROVIDER_TYPE_UNSPECIFIED;
    case 1:
    case "OAUTH2":
      return IdentityProviderType.OAUTH2;
    case 2:
    case "OIDC":
      return IdentityProviderType.OIDC;
    case -1:
    case "UNRECOGNIZED":
    default:
      return IdentityProviderType.UNRECOGNIZED;
  }
}

export function identityProviderTypeToJSON(object: IdentityProviderType): string {
  switch (object) {
    case IdentityProviderType.IDENTITY_PROVIDER_TYPE_UNSPECIFIED:
      return "IDENTITY_PROVIDER_TYPE_UNSPECIFIED";
    case IdentityProviderType.OAUTH2:
      return "OAUTH2";
    case IdentityProviderType.OIDC:
      return "OIDC";
    case IdentityProviderType.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface IdentityProviderConfig {
  oauth2Config?: OAuth2IdentityProviderConfig | undefined;
  oidcConfig?: OIDCIdentityProviderConfig | undefined;
}

/** OAuth2IdentityProviderConfig is the structure for OAuth2 identity provider config. */
export interface OAuth2IdentityProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  fieldMapping?: FieldMapping;
  skipTlsVerify: boolean;
}

/** OIDCIdentityProviderConfig is the structure for OIDC identity provider config. */
export interface OIDCIdentityProviderConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  fieldMapping?: FieldMapping;
  skipTlsVerify: boolean;
}

/**
 * FieldMapping saves the field names from user info API of identity provider.
 * As we save all raw json string of user info response data into `principal.idp_user_info`,
 * we can extract the relevant data based with `FieldMapping`.
 *
 * e.g. For GitHub authenticated user API, it will return `login`, `name` and `email` in response.
 * Then the identifier of FieldMapping will be `login`, display_name will be `name`,
 * and email will be `email`.
 * reference: https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
 */
export interface FieldMapping {
  /** Identifier is the field name of the unique identifier in 3rd-party idp user info. Required. */
  identifier: string;
  /** DisplayName is the field name of display name in 3rd-party idp user info. Required. */
  displayName: string;
  /** Email is the field name of primary email in 3rd-party idp user info. Required. */
  email: string;
}

export interface IdentityProviderUserInfo {
  /** Identifier is the value of the unique identifier in 3rd-party idp user info. */
  identifier: string;
  /** DisplayName is the value of display name in 3rd-party idp user info. */
  displayName: string;
  /** Email is the value of primary email in 3rd-party idp user info. */
  email: string;
}

function createBaseIdentityProviderConfig(): IdentityProviderConfig {
  return { oauth2Config: undefined, oidcConfig: undefined };
}

export const IdentityProviderConfig = {
  encode(message: IdentityProviderConfig, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.oauth2Config !== undefined) {
      OAuth2IdentityProviderConfig.encode(message.oauth2Config, writer.uint32(10).fork()).ldelim();
    }
    if (message.oidcConfig !== undefined) {
      OIDCIdentityProviderConfig.encode(message.oidcConfig, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IdentityProviderConfig {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIdentityProviderConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.oauth2Config = OAuth2IdentityProviderConfig.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.oidcConfig = OIDCIdentityProviderConfig.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): IdentityProviderConfig {
    return {
      oauth2Config: isSet(object.oauth2Config) ? OAuth2IdentityProviderConfig.fromJSON(object.oauth2Config) : undefined,
      oidcConfig: isSet(object.oidcConfig) ? OIDCIdentityProviderConfig.fromJSON(object.oidcConfig) : undefined,
    };
  },

  toJSON(message: IdentityProviderConfig): unknown {
    const obj: any = {};
    message.oauth2Config !== undefined &&
      (obj.oauth2Config = message.oauth2Config ? OAuth2IdentityProviderConfig.toJSON(message.oauth2Config) : undefined);
    message.oidcConfig !== undefined &&
      (obj.oidcConfig = message.oidcConfig ? OIDCIdentityProviderConfig.toJSON(message.oidcConfig) : undefined);
    return obj;
  },

  create(base?: DeepPartial<IdentityProviderConfig>): IdentityProviderConfig {
    return IdentityProviderConfig.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<IdentityProviderConfig>): IdentityProviderConfig {
    const message = createBaseIdentityProviderConfig();
    message.oauth2Config = (object.oauth2Config !== undefined && object.oauth2Config !== null)
      ? OAuth2IdentityProviderConfig.fromPartial(object.oauth2Config)
      : undefined;
    message.oidcConfig = (object.oidcConfig !== undefined && object.oidcConfig !== null)
      ? OIDCIdentityProviderConfig.fromPartial(object.oidcConfig)
      : undefined;
    return message;
  },
};

function createBaseOAuth2IdentityProviderConfig(): OAuth2IdentityProviderConfig {
  return {
    authUrl: "",
    tokenUrl: "",
    userInfoUrl: "",
    clientId: "",
    clientSecret: "",
    scopes: [],
    fieldMapping: undefined,
    skipTlsVerify: false,
  };
}

export const OAuth2IdentityProviderConfig = {
  encode(message: OAuth2IdentityProviderConfig, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.authUrl !== "") {
      writer.uint32(10).string(message.authUrl);
    }
    if (message.tokenUrl !== "") {
      writer.uint32(18).string(message.tokenUrl);
    }
    if (message.userInfoUrl !== "") {
      writer.uint32(26).string(message.userInfoUrl);
    }
    if (message.clientId !== "") {
      writer.uint32(34).string(message.clientId);
    }
    if (message.clientSecret !== "") {
      writer.uint32(42).string(message.clientSecret);
    }
    for (const v of message.scopes) {
      writer.uint32(50).string(v!);
    }
    if (message.fieldMapping !== undefined) {
      FieldMapping.encode(message.fieldMapping, writer.uint32(58).fork()).ldelim();
    }
    if (message.skipTlsVerify === true) {
      writer.uint32(64).bool(message.skipTlsVerify);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OAuth2IdentityProviderConfig {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOAuth2IdentityProviderConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.authUrl = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.tokenUrl = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.userInfoUrl = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.clientId = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.clientSecret = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.scopes.push(reader.string());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.fieldMapping = FieldMapping.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 64) {
            break;
          }

          message.skipTlsVerify = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OAuth2IdentityProviderConfig {
    return {
      authUrl: isSet(object.authUrl) ? String(object.authUrl) : "",
      tokenUrl: isSet(object.tokenUrl) ? String(object.tokenUrl) : "",
      userInfoUrl: isSet(object.userInfoUrl) ? String(object.userInfoUrl) : "",
      clientId: isSet(object.clientId) ? String(object.clientId) : "",
      clientSecret: isSet(object.clientSecret) ? String(object.clientSecret) : "",
      scopes: Array.isArray(object?.scopes) ? object.scopes.map((e: any) => String(e)) : [],
      fieldMapping: isSet(object.fieldMapping) ? FieldMapping.fromJSON(object.fieldMapping) : undefined,
      skipTlsVerify: isSet(object.skipTlsVerify) ? Boolean(object.skipTlsVerify) : false,
    };
  },

  toJSON(message: OAuth2IdentityProviderConfig): unknown {
    const obj: any = {};
    message.authUrl !== undefined && (obj.authUrl = message.authUrl);
    message.tokenUrl !== undefined && (obj.tokenUrl = message.tokenUrl);
    message.userInfoUrl !== undefined && (obj.userInfoUrl = message.userInfoUrl);
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.clientSecret !== undefined && (obj.clientSecret = message.clientSecret);
    if (message.scopes) {
      obj.scopes = message.scopes.map((e) => e);
    } else {
      obj.scopes = [];
    }
    message.fieldMapping !== undefined &&
      (obj.fieldMapping = message.fieldMapping ? FieldMapping.toJSON(message.fieldMapping) : undefined);
    message.skipTlsVerify !== undefined && (obj.skipTlsVerify = message.skipTlsVerify);
    return obj;
  },

  create(base?: DeepPartial<OAuth2IdentityProviderConfig>): OAuth2IdentityProviderConfig {
    return OAuth2IdentityProviderConfig.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<OAuth2IdentityProviderConfig>): OAuth2IdentityProviderConfig {
    const message = createBaseOAuth2IdentityProviderConfig();
    message.authUrl = object.authUrl ?? "";
    message.tokenUrl = object.tokenUrl ?? "";
    message.userInfoUrl = object.userInfoUrl ?? "";
    message.clientId = object.clientId ?? "";
    message.clientSecret = object.clientSecret ?? "";
    message.scopes = object.scopes?.map((e) => e) || [];
    message.fieldMapping = (object.fieldMapping !== undefined && object.fieldMapping !== null)
      ? FieldMapping.fromPartial(object.fieldMapping)
      : undefined;
    message.skipTlsVerify = object.skipTlsVerify ?? false;
    return message;
  },
};

function createBaseOIDCIdentityProviderConfig(): OIDCIdentityProviderConfig {
  return { issuer: "", clientId: "", clientSecret: "", fieldMapping: undefined, skipTlsVerify: false };
}

export const OIDCIdentityProviderConfig = {
  encode(message: OIDCIdentityProviderConfig, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.issuer !== "") {
      writer.uint32(10).string(message.issuer);
    }
    if (message.clientId !== "") {
      writer.uint32(18).string(message.clientId);
    }
    if (message.clientSecret !== "") {
      writer.uint32(26).string(message.clientSecret);
    }
    if (message.fieldMapping !== undefined) {
      FieldMapping.encode(message.fieldMapping, writer.uint32(34).fork()).ldelim();
    }
    if (message.skipTlsVerify === true) {
      writer.uint32(40).bool(message.skipTlsVerify);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): OIDCIdentityProviderConfig {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOIDCIdentityProviderConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.issuer = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.clientId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.clientSecret = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.fieldMapping = FieldMapping.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 40) {
            break;
          }

          message.skipTlsVerify = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): OIDCIdentityProviderConfig {
    return {
      issuer: isSet(object.issuer) ? String(object.issuer) : "",
      clientId: isSet(object.clientId) ? String(object.clientId) : "",
      clientSecret: isSet(object.clientSecret) ? String(object.clientSecret) : "",
      fieldMapping: isSet(object.fieldMapping) ? FieldMapping.fromJSON(object.fieldMapping) : undefined,
      skipTlsVerify: isSet(object.skipTlsVerify) ? Boolean(object.skipTlsVerify) : false,
    };
  },

  toJSON(message: OIDCIdentityProviderConfig): unknown {
    const obj: any = {};
    message.issuer !== undefined && (obj.issuer = message.issuer);
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.clientSecret !== undefined && (obj.clientSecret = message.clientSecret);
    message.fieldMapping !== undefined &&
      (obj.fieldMapping = message.fieldMapping ? FieldMapping.toJSON(message.fieldMapping) : undefined);
    message.skipTlsVerify !== undefined && (obj.skipTlsVerify = message.skipTlsVerify);
    return obj;
  },

  create(base?: DeepPartial<OIDCIdentityProviderConfig>): OIDCIdentityProviderConfig {
    return OIDCIdentityProviderConfig.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<OIDCIdentityProviderConfig>): OIDCIdentityProviderConfig {
    const message = createBaseOIDCIdentityProviderConfig();
    message.issuer = object.issuer ?? "";
    message.clientId = object.clientId ?? "";
    message.clientSecret = object.clientSecret ?? "";
    message.fieldMapping = (object.fieldMapping !== undefined && object.fieldMapping !== null)
      ? FieldMapping.fromPartial(object.fieldMapping)
      : undefined;
    message.skipTlsVerify = object.skipTlsVerify ?? false;
    return message;
  },
};

function createBaseFieldMapping(): FieldMapping {
  return { identifier: "", displayName: "", email: "" };
}

export const FieldMapping = {
  encode(message: FieldMapping, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.identifier !== "") {
      writer.uint32(10).string(message.identifier);
    }
    if (message.displayName !== "") {
      writer.uint32(18).string(message.displayName);
    }
    if (message.email !== "") {
      writer.uint32(26).string(message.email);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): FieldMapping {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFieldMapping();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.identifier = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.displayName = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.email = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): FieldMapping {
    return {
      identifier: isSet(object.identifier) ? String(object.identifier) : "",
      displayName: isSet(object.displayName) ? String(object.displayName) : "",
      email: isSet(object.email) ? String(object.email) : "",
    };
  },

  toJSON(message: FieldMapping): unknown {
    const obj: any = {};
    message.identifier !== undefined && (obj.identifier = message.identifier);
    message.displayName !== undefined && (obj.displayName = message.displayName);
    message.email !== undefined && (obj.email = message.email);
    return obj;
  },

  create(base?: DeepPartial<FieldMapping>): FieldMapping {
    return FieldMapping.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<FieldMapping>): FieldMapping {
    const message = createBaseFieldMapping();
    message.identifier = object.identifier ?? "";
    message.displayName = object.displayName ?? "";
    message.email = object.email ?? "";
    return message;
  },
};

function createBaseIdentityProviderUserInfo(): IdentityProviderUserInfo {
  return { identifier: "", displayName: "", email: "" };
}

export const IdentityProviderUserInfo = {
  encode(message: IdentityProviderUserInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.identifier !== "") {
      writer.uint32(10).string(message.identifier);
    }
    if (message.displayName !== "") {
      writer.uint32(18).string(message.displayName);
    }
    if (message.email !== "") {
      writer.uint32(26).string(message.email);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IdentityProviderUserInfo {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIdentityProviderUserInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.identifier = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.displayName = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.email = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): IdentityProviderUserInfo {
    return {
      identifier: isSet(object.identifier) ? String(object.identifier) : "",
      displayName: isSet(object.displayName) ? String(object.displayName) : "",
      email: isSet(object.email) ? String(object.email) : "",
    };
  },

  toJSON(message: IdentityProviderUserInfo): unknown {
    const obj: any = {};
    message.identifier !== undefined && (obj.identifier = message.identifier);
    message.displayName !== undefined && (obj.displayName = message.displayName);
    message.email !== undefined && (obj.email = message.email);
    return obj;
  },

  create(base?: DeepPartial<IdentityProviderUserInfo>): IdentityProviderUserInfo {
    return IdentityProviderUserInfo.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<IdentityProviderUserInfo>): IdentityProviderUserInfo {
    const message = createBaseIdentityProviderUserInfo();
    message.identifier = object.identifier ?? "";
    message.displayName = object.displayName ?? "";
    message.email = object.email ?? "";
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
