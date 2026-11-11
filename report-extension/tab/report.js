(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // node_modules/azure-devops-extension-sdk/esm/SDK.min.js
  var e = parseInt("10000000000", 36);
  var t = Number.MAX_SAFE_INTEGER || 9007199254740991;
  var n = class {
    constructor() {
      __publicField(this, "objects", {});
    }
    register(e2, t2) {
      this.objects[e2] = t2;
    }
    unregister(e2) {
      delete this.objects[e2];
    }
    getInstance(e2, t2) {
      var n2 = this.objects[e2];
      if (n2) return "function" == typeof n2 ? n2(t2) : n2;
    }
  };
  var o = 1;
  var r = class {
    constructor(r2, s2) {
      __publicField(this, "promises", {});
      __publicField(this, "postToWindow");
      __publicField(this, "targetOrigin");
      __publicField(this, "handshakeToken");
      __publicField(this, "registry");
      __publicField(this, "channelId");
      __publicField(this, "nextMessageId", 1);
      __publicField(this, "nextProxyId", 1);
      __publicField(this, "proxyFunctions", {});
      this.postToWindow = r2, this.targetOrigin = s2, this.registry = new n(), this.channelId = o++, this.targetOrigin || (this.handshakeToken = Math.floor(Math.random() * (t - e) + e).toString(36) + Math.floor(Math.random() * (t - e) + e).toString(36));
    }
    getObjectRegistry() {
      return this.registry;
    }
    async invokeRemoteMethod(e2, t2, n2, o2, r2) {
      const s2 = { id: this.nextMessageId++, methodName: e2, instanceId: t2, instanceContext: o2, params: this._customSerializeObject(n2, r2), serializationSettings: r2 };
      this.targetOrigin || (s2.handshakeToken = this.handshakeToken);
      const i2 = new Promise(((e3, t3) => {
        this.promises[s2.id] = { resolve: e3, reject: t3 };
      }));
      return this._sendRpcMessage(s2), i2;
    }
    getRemoteObjectProxy(e2, t2) {
      return this.invokeRemoteMethod("", e2, void 0, t2);
    }
    invokeMethod(e2, t2) {
      if (t2.methodName) {
        var n2 = e2[t2.methodName];
        if ("function" == typeof n2) try {
          var o2 = [];
          t2.params && (o2 = this._customDeserializeObject(t2.params, {}));
          var r2 = n2.apply(e2, o2);
          r2 && r2.then && "function" == typeof r2.then ? r2.then(((e3) => {
            this._success(t2, e3, t2.handshakeToken);
          }), ((e3) => {
            this.error(t2, e3);
          })) : this._success(t2, r2, t2.handshakeToken);
        } catch (e3) {
          this.error(t2, e3);
        }
        else this.error(t2, new Error("RPC method not found: " + t2.methodName));
      } else this._success(t2, e2, t2.handshakeToken);
    }
    getRegisteredObject(e2, t2) {
      if ("__proxyFunctions" === e2) return this.proxyFunctions;
      var n2 = this.registry.getInstance(e2, t2);
      return n2 || (n2 = s.getInstance(e2, t2)), n2;
    }
    onMessage(e2) {
      if (e2.instanceId) {
        const t2 = this.getRegisteredObject(e2.instanceId, e2.instanceContext);
        if (!t2) return false;
        "function" == typeof t2.then ? t2.then(((t3) => {
          this.invokeMethod(t3, e2);
        }), ((t3) => {
          this.error(e2, t3);
        })) : this.invokeMethod(t2, e2);
      } else {
        const t2 = this.promises[e2.id];
        if (!t2) return false;
        e2.error ? t2.reject(this._customDeserializeObject([e2.error], {})[0]) : t2.resolve(this._customDeserializeObject([e2.result], {})[0]), delete this.promises[e2.id];
      }
      return true;
    }
    owns(e2, t2, n2) {
      if (this.postToWindow === e2) {
        if (this.targetOrigin) return !!t2 && ("null" === t2.toLowerCase() || 0 === this.targetOrigin.toLowerCase().indexOf(t2.toLowerCase()));
        if (n2.handshakeToken && n2.handshakeToken === this.handshakeToken) return this.targetOrigin = t2, true;
      }
      return false;
    }
    error(e2, t2) {
      this._sendRpcMessage({ id: e2.id, error: this._customSerializeObject([t2], e2.serializationSettings)[0], handshakeToken: e2.handshakeToken });
    }
    _success(e2, t2, n2) {
      this._sendRpcMessage({ id: e2.id, result: this._customSerializeObject([t2], e2.serializationSettings)[0], handshakeToken: n2 });
    }
    _sendRpcMessage(e2) {
      this.postToWindow.postMessage(JSON.stringify(e2), "*");
    }
    _customSerializeObject(e2, t2, n2, o2 = 1, r2 = 1) {
      if (!e2 || r2 > 100) return;
      if (e2 instanceof Node || e2 instanceof Window || e2 instanceof Event) return;
      var s2;
      let i2;
      i2 = n2 || { newObjects: [], originalObjects: [] }, i2.originalObjects.push(e2);
      var c = (n3, s3, c2) => {
        var a2;
        try {
          a2 = n3[c2];
        } catch (e3) {
        }
        var d3 = typeof a2;
        if ("undefined" !== d3) {
          var h3 = -1;
          if ("object" === d3 && (h3 = i2.originalObjects.indexOf(a2)), h3 >= 0) {
            var u2 = i2.newObjects[h3];
            u2.__circularReferenceId || (u2.__circularReferenceId = o2++), s3[c2] = { __circularReference: u2.__circularReferenceId };
          } else "function" === d3 ? (this.nextProxyId++, s3[c2] = { __proxyFunctionId: this._registerProxyFunction(a2, e2), _channelId: this.channelId }) : "object" === d3 ? a2 && a2 instanceof Date ? s3[c2] = { __proxyDate: a2.getTime() } : s3[c2] = this._customSerializeObject(a2, t2, i2, o2, r2 + 1) : "__proxyFunctionId" !== c2 && (s3[c2] = a2);
        }
      };
      if (e2 instanceof Array) {
        s2 = [], i2.newObjects.push(s2);
        for (var a = 0, d2 = e2.length; a < d2; a++) c(e2, s2, a);
      } else {
        s2 = {}, i2.newObjects.push(s2);
        let n3 = {};
        try {
          n3 = (function(e3) {
            const t3 = {};
            for (; e3 && e3 !== Object.prototype; ) {
              const n4 = Object.getOwnPropertyNames(e3);
              for (const e4 of n4) "constructor" !== e4 && (t3[e4] = true);
              e3 = Object.getPrototypeOf(e3);
            }
            return t3;
          })(e2);
        } catch (e3) {
        }
        for (var h2 in n3) (h2 && "_" !== h2[0] || t2 && t2.includeUnderscoreProperties) && c(e2, s2, h2);
      }
      return i2.originalObjects.pop(), i2.newObjects.pop(), s2;
    }
    _registerProxyFunction(e2, t2) {
      var n2 = this.nextProxyId++;
      return this.proxyFunctions["proxy" + n2] = function() {
        return e2.apply(t2, Array.prototype.slice.call(arguments, 0));
      }, n2;
    }
    _customDeserializeObject(e2, t2) {
      var n2 = this;
      if (!e2) return null;
      var o2 = (e3, o3) => {
        var r3 = e3[o3], s3 = typeof r3;
        "__circularReferenceId" === o3 && "number" === s3 ? (t2[r3] = e3, delete e3[o3]) : "object" === s3 && r3 && (r3.__proxyFunctionId ? e3[o3] = function() {
          return n2.invokeRemoteMethod("proxy" + r3.__proxyFunctionId, "__proxyFunctions", Array.prototype.slice.call(arguments, 0), {}, { includeUnderscoreProperties: true });
        } : r3.__proxyDate ? e3[o3] = new Date(r3.__proxyDate) : r3.__circularReference ? e3[o3] = t2[r3.__circularReference] : this._customDeserializeObject(r3, t2));
      };
      if (e2 instanceof Array) for (var r2 = 0, s2 = e2.length; r2 < s2; r2++) o2(e2, r2);
      else if ("object" == typeof e2) for (var i2 in e2) o2(e2, i2);
      return e2;
    }
  };
  var s = new n();
  var i = new class {
    constructor() {
      __publicField(this, "_channels", []);
      __publicField(this, "_handleMessageReceived", (e2) => {
        let t2;
        if ("string" == typeof e2.data) try {
          t2 = JSON.parse(e2.data);
        } catch (e3) {
        }
        if (t2) {
          let n2, o2 = false;
          for (const r2 of this._channels) r2.owns(e2.source, e2.origin, t2) && (n2 = r2, o2 = r2.onMessage(t2) || o2);
          n2 && !o2 && (window.console && console.error(`No handler found on any channel for message: ${JSON.stringify(t2)}`), t2.instanceId && n2.error(t2, new Error(`The registered object ${t2.instanceId} could not be found.`)));
        }
      });
      window.addEventListener("message", this._handleMessageReceived);
    }
    addChannel(e2, t2) {
      const n2 = new r(e2, t2);
      return this._channels.push(n2), n2;
    }
    removeChannel(e2) {
      this._channels = this._channels.filter(((t2) => t2 !== e2));
    }
  }();
  var d = window;
  var h;
  d._AzureDevOpsSDKVersion && console.error("The AzureDevOps SDK is already loaded. Only one version of this module can be loaded in a given document."), d._AzureDevOpsSDKVersion = 5, (function(e2) {
    e2[e2.Unknown = 0] = "Unknown", e2[e2.Deployment = 1] = "Deployment", e2[e2.Enterprise = 2] = "Enterprise", e2[e2.Organization = 4] = "Organization";
  })(h || (h = {}));
  var u = "DevOps.HostControl";
  var l = i.addChannel(window.parent);
  var p;
  var f;
  var g;
  var m;
  var y;
  var v;
  var b;
  var w;
  var _;
  var O;
  var k = new Promise(((e2) => {
    O = e2;
  }));
  function x(e2, t2) {
    const n2 = window;
    let o2;
    "function" == typeof n2.CustomEvent ? o2 = new n2.CustomEvent(e2, t2) : (t2 = t2 || { bubbles: false, cancelable: false }, o2 = document.createEvent("CustomEvent"), o2.initCustomEvent(e2, t2.bubbles, t2.cancelable, t2.detail)), window.dispatchEvent(o2);
  }
  function j(e2) {
    return new Promise(((t2) => {
      const n2 = { ...e2, sdkVersion: 5 };
      l.invokeRemoteMethod("initialHandshake", u, [n2]).then(((e3) => {
        if ("pageContext" in e3) {
          const t3 = e3;
          if (g = t3.pageContext, f = g ? g.webContext : void 0, p = f ? f.team : void 0, y = t3.initialConfig || {}, v = t3.contribution.id, m = t3.extensionContext, m.id = m.publisherId + "." + m.extensionId, "context" in e3) {
            const t4 = e3.context;
            b = t4.user, w = t4.host;
          }
        } else {
          const t3 = e3, n3 = t3.context;
          g = n3.pageContext, f = g ? g.webContext : void 0, p = f ? f.team : void 0, y = t3.initialConfig || {}, v = t3.contributionId, m = n3.extension, b = n3.user, w = n3.host;
        }
        e3.themeData && (V(e3.themeData), window.addEventListener("themeChanged", ((e4) => {
          V(e4.detail.data);
        }))), O(), t2();
      }));
    }));
  }
  async function R() {
    return k;
  }
  function I() {
    return l.invokeRemoteMethod("notifyLoadSucceeded", u);
  }
  function M(e2) {
    return `Attempted to call ${e2}() before init() was complete. Wait for init to complete or place within a ready() callback.`;
  }
  function C() {
    if (!y) throw new Error(M("getConfiguration"));
    return y;
  }
  async function F(e2) {
    return R().then((() => l.invokeRemoteMethod("getService", "DevOps.ServiceManager", [e2])));
  }
  function L(e2, t2) {
    l.getObjectRegistry().register(e2, t2);
  }
  async function J() {
    return l.invokeRemoteMethod("getAccessToken", u).then(((e2) => e2.token));
  }
  function V(e2) {
    _ || (_ = document.createElement("style"), _.type = "text/css", document.head.appendChild(_));
    const t2 = [];
    if (e2) for (const n2 in e2) t2.push("--" + n2 + ": " + e2[n2]);
    _.innerText = ":root { " + t2.join("; ") + " } body { color: var(--text-primary-color) }", x("themeApplied", { detail: e2 });
  }
  l.getObjectRegistry().register("DevOps.SdkClient", { dispatchEvent: x });

  // node_modules/azure-devops-extension-api/esm/Common/Client.js
  function getClient(clientClass, clientOptions) {
    const options = clientOptions || {};
    if (!options.rootPath) {
      options.rootPath = F(
        "ms.vss-features.location-service"
        /* CommonServiceIds.LocationService */
      ).then((locationService) => {
        if (clientClass.RESOURCE_AREA_ID) {
          return locationService.getResourceAreaLocation(clientClass.RESOURCE_AREA_ID);
        } else {
          return locationService.getServiceLocation();
        }
      });
    }
    if (!options.authTokenProvider) {
      options.authTokenProvider = {
        getAuthorizationHeader: () => {
          return J().then((token) => token ? "Bearer " + token : "");
        }
      };
    }
    return new clientClass(options);
  }

  // node_modules/azure-devops-extension-api/esm/Common/CommonServices.js
  var CommonServiceIds;
  (function(CommonServiceIds2) {
    CommonServiceIds2["ExtensionDataService"] = "ms.vss-features.extension-data-service";
    CommonServiceIds2["GlobalMessagesService"] = "ms.vss-tfs-web.tfs-global-messages-service";
    CommonServiceIds2["HostNavigationService"] = "ms.vss-features.host-navigation-service";
    CommonServiceIds2["HostPageLayoutService"] = "ms.vss-features.host-page-layout-service";
    CommonServiceIds2["LocationService"] = "ms.vss-features.location-service";
    CommonServiceIds2["ProjectPageService"] = "ms.vss-tfs-web.tfs-page-data-service";
  })(CommonServiceIds || (CommonServiceIds = {}));
  var TeamFoundationHostType;
  (function(TeamFoundationHostType2) {
    TeamFoundationHostType2[TeamFoundationHostType2["Deployment"] = 1] = "Deployment";
    TeamFoundationHostType2[TeamFoundationHostType2["Enterprise"] = 2] = "Enterprise";
    TeamFoundationHostType2[TeamFoundationHostType2["Organization"] = 4] = "Organization";
  })(TeamFoundationHostType || (TeamFoundationHostType = {}));
  var PanelSize;
  (function(PanelSize2) {
    PanelSize2[PanelSize2["Small"] = 0] = "Small";
    PanelSize2[PanelSize2["Medium"] = 1] = "Medium";
    PanelSize2[PanelSize2["Large"] = 2] = "Large";
  })(PanelSize || (PanelSize = {}));
  var MessageBannerLevel;
  (function(MessageBannerLevel2) {
    MessageBannerLevel2[MessageBannerLevel2["info"] = 0] = "info";
    MessageBannerLevel2[MessageBannerLevel2["warning"] = 1] = "warning";
    MessageBannerLevel2[MessageBannerLevel2["error"] = 2] = "error";
    MessageBannerLevel2[MessageBannerLevel2["success"] = 3] = "success";
  })(MessageBannerLevel || (MessageBannerLevel = {}));

  // node_modules/azure-devops-extension-api/esm/Release/Release.js
  var AgentArtifactType;
  (function(AgentArtifactType2) {
    AgentArtifactType2[AgentArtifactType2["XamlBuild"] = 0] = "XamlBuild";
    AgentArtifactType2[AgentArtifactType2["Build"] = 1] = "Build";
    AgentArtifactType2[AgentArtifactType2["Jenkins"] = 2] = "Jenkins";
    AgentArtifactType2[AgentArtifactType2["FileShare"] = 3] = "FileShare";
    AgentArtifactType2[AgentArtifactType2["Nuget"] = 4] = "Nuget";
    AgentArtifactType2[AgentArtifactType2["TfsOnPrem"] = 5] = "TfsOnPrem";
    AgentArtifactType2[AgentArtifactType2["GitHub"] = 6] = "GitHub";
    AgentArtifactType2[AgentArtifactType2["TFGit"] = 7] = "TFGit";
    AgentArtifactType2[AgentArtifactType2["ExternalTfsBuild"] = 8] = "ExternalTfsBuild";
    AgentArtifactType2[AgentArtifactType2["Custom"] = 9] = "Custom";
    AgentArtifactType2[AgentArtifactType2["Tfvc"] = 10] = "Tfvc";
  })(AgentArtifactType || (AgentArtifactType = {}));
  var ApprovalExecutionOrder;
  (function(ApprovalExecutionOrder2) {
    ApprovalExecutionOrder2[ApprovalExecutionOrder2["BeforeGates"] = 1] = "BeforeGates";
    ApprovalExecutionOrder2[ApprovalExecutionOrder2["AfterSuccessfulGates"] = 2] = "AfterSuccessfulGates";
    ApprovalExecutionOrder2[ApprovalExecutionOrder2["AfterGatesAlways"] = 4] = "AfterGatesAlways";
  })(ApprovalExecutionOrder || (ApprovalExecutionOrder = {}));
  var ApprovalFilters;
  (function(ApprovalFilters2) {
    ApprovalFilters2[ApprovalFilters2["None"] = 0] = "None";
    ApprovalFilters2[ApprovalFilters2["ManualApprovals"] = 1] = "ManualApprovals";
    ApprovalFilters2[ApprovalFilters2["AutomatedApprovals"] = 2] = "AutomatedApprovals";
    ApprovalFilters2[ApprovalFilters2["ApprovalSnapshots"] = 4] = "ApprovalSnapshots";
    ApprovalFilters2[ApprovalFilters2["All"] = 7] = "All";
  })(ApprovalFilters || (ApprovalFilters = {}));
  var ApprovalStatus;
  (function(ApprovalStatus2) {
    ApprovalStatus2[ApprovalStatus2["Undefined"] = 0] = "Undefined";
    ApprovalStatus2[ApprovalStatus2["Pending"] = 1] = "Pending";
    ApprovalStatus2[ApprovalStatus2["Approved"] = 2] = "Approved";
    ApprovalStatus2[ApprovalStatus2["Rejected"] = 4] = "Rejected";
    ApprovalStatus2[ApprovalStatus2["Reassigned"] = 6] = "Reassigned";
    ApprovalStatus2[ApprovalStatus2["Canceled"] = 7] = "Canceled";
    ApprovalStatus2[ApprovalStatus2["Skipped"] = 8] = "Skipped";
  })(ApprovalStatus || (ApprovalStatus = {}));
  var ApprovalType;
  (function(ApprovalType2) {
    ApprovalType2[ApprovalType2["Undefined"] = 0] = "Undefined";
    ApprovalType2[ApprovalType2["PreDeploy"] = 1] = "PreDeploy";
    ApprovalType2[ApprovalType2["PostDeploy"] = 2] = "PostDeploy";
    ApprovalType2[ApprovalType2["All"] = 3] = "All";
  })(ApprovalType || (ApprovalType = {}));
  var AuditAction;
  (function(AuditAction2) {
    AuditAction2[AuditAction2["Add"] = 1] = "Add";
    AuditAction2[AuditAction2["Update"] = 2] = "Update";
    AuditAction2[AuditAction2["Delete"] = 3] = "Delete";
    AuditAction2[AuditAction2["Undelete"] = 4] = "Undelete";
  })(AuditAction || (AuditAction = {}));
  var AuthorizationHeaderFor;
  (function(AuthorizationHeaderFor2) {
    AuthorizationHeaderFor2[AuthorizationHeaderFor2["RevalidateApproverIdentity"] = 0] = "RevalidateApproverIdentity";
    AuthorizationHeaderFor2[AuthorizationHeaderFor2["OnBehalfOf"] = 1] = "OnBehalfOf";
  })(AuthorizationHeaderFor || (AuthorizationHeaderFor = {}));
  var ConditionType;
  (function(ConditionType2) {
    ConditionType2[ConditionType2["Undefined"] = 0] = "Undefined";
    ConditionType2[ConditionType2["Event"] = 1] = "Event";
    ConditionType2[ConditionType2["EnvironmentState"] = 2] = "EnvironmentState";
    ConditionType2[ConditionType2["Artifact"] = 4] = "Artifact";
  })(ConditionType || (ConditionType = {}));
  var DeploymentAuthorizationOwner;
  (function(DeploymentAuthorizationOwner2) {
    DeploymentAuthorizationOwner2[DeploymentAuthorizationOwner2["Automatic"] = 0] = "Automatic";
    DeploymentAuthorizationOwner2[DeploymentAuthorizationOwner2["DeploymentSubmitter"] = 1] = "DeploymentSubmitter";
    DeploymentAuthorizationOwner2[DeploymentAuthorizationOwner2["FirstPreDeploymentApprover"] = 2] = "FirstPreDeploymentApprover";
  })(DeploymentAuthorizationOwner || (DeploymentAuthorizationOwner = {}));
  var DeploymentExpands;
  (function(DeploymentExpands2) {
    DeploymentExpands2[DeploymentExpands2["All"] = 0] = "All";
    DeploymentExpands2[DeploymentExpands2["DeploymentOnly"] = 1] = "DeploymentOnly";
    DeploymentExpands2[DeploymentExpands2["Approvals"] = 2] = "Approvals";
    DeploymentExpands2[DeploymentExpands2["Artifacts"] = 4] = "Artifacts";
  })(DeploymentExpands || (DeploymentExpands = {}));
  var DeploymentOperationStatus;
  (function(DeploymentOperationStatus2) {
    DeploymentOperationStatus2[DeploymentOperationStatus2["Undefined"] = 0] = "Undefined";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Queued"] = 1] = "Queued";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Scheduled"] = 2] = "Scheduled";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Pending"] = 4] = "Pending";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Approved"] = 8] = "Approved";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Rejected"] = 16] = "Rejected";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Deferred"] = 32] = "Deferred";
    DeploymentOperationStatus2[DeploymentOperationStatus2["QueuedForAgent"] = 64] = "QueuedForAgent";
    DeploymentOperationStatus2[DeploymentOperationStatus2["PhaseInProgress"] = 128] = "PhaseInProgress";
    DeploymentOperationStatus2[DeploymentOperationStatus2["PhaseSucceeded"] = 256] = "PhaseSucceeded";
    DeploymentOperationStatus2[DeploymentOperationStatus2["PhasePartiallySucceeded"] = 512] = "PhasePartiallySucceeded";
    DeploymentOperationStatus2[DeploymentOperationStatus2["PhaseFailed"] = 1024] = "PhaseFailed";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Canceled"] = 2048] = "Canceled";
    DeploymentOperationStatus2[DeploymentOperationStatus2["PhaseCanceled"] = 4096] = "PhaseCanceled";
    DeploymentOperationStatus2[DeploymentOperationStatus2["ManualInterventionPending"] = 8192] = "ManualInterventionPending";
    DeploymentOperationStatus2[DeploymentOperationStatus2["QueuedForPipeline"] = 16384] = "QueuedForPipeline";
    DeploymentOperationStatus2[DeploymentOperationStatus2["Cancelling"] = 32768] = "Cancelling";
    DeploymentOperationStatus2[DeploymentOperationStatus2["EvaluatingGates"] = 65536] = "EvaluatingGates";
    DeploymentOperationStatus2[DeploymentOperationStatus2["GateFailed"] = 131072] = "GateFailed";
    DeploymentOperationStatus2[DeploymentOperationStatus2["All"] = 258047] = "All";
  })(DeploymentOperationStatus || (DeploymentOperationStatus = {}));
  var DeploymentReason;
  (function(DeploymentReason2) {
    DeploymentReason2[DeploymentReason2["None"] = 0] = "None";
    DeploymentReason2[DeploymentReason2["Manual"] = 1] = "Manual";
    DeploymentReason2[DeploymentReason2["Automated"] = 2] = "Automated";
    DeploymentReason2[DeploymentReason2["Scheduled"] = 4] = "Scheduled";
    DeploymentReason2[DeploymentReason2["RedeployTrigger"] = 8] = "RedeployTrigger";
  })(DeploymentReason || (DeploymentReason = {}));
  var DeploymentsQueryType;
  (function(DeploymentsQueryType2) {
    DeploymentsQueryType2[DeploymentsQueryType2["Regular"] = 1] = "Regular";
    DeploymentsQueryType2[DeploymentsQueryType2["FailingSince"] = 2] = "FailingSince";
  })(DeploymentsQueryType || (DeploymentsQueryType = {}));
  var DeploymentStatus;
  (function(DeploymentStatus2) {
    DeploymentStatus2[DeploymentStatus2["Undefined"] = 0] = "Undefined";
    DeploymentStatus2[DeploymentStatus2["NotDeployed"] = 1] = "NotDeployed";
    DeploymentStatus2[DeploymentStatus2["InProgress"] = 2] = "InProgress";
    DeploymentStatus2[DeploymentStatus2["Succeeded"] = 4] = "Succeeded";
    DeploymentStatus2[DeploymentStatus2["PartiallySucceeded"] = 8] = "PartiallySucceeded";
    DeploymentStatus2[DeploymentStatus2["Failed"] = 16] = "Failed";
    DeploymentStatus2[DeploymentStatus2["All"] = 31] = "All";
  })(DeploymentStatus || (DeploymentStatus = {}));
  var DeployPhaseStatus;
  (function(DeployPhaseStatus2) {
    DeployPhaseStatus2[DeployPhaseStatus2["Undefined"] = 0] = "Undefined";
    DeployPhaseStatus2[DeployPhaseStatus2["NotStarted"] = 1] = "NotStarted";
    DeployPhaseStatus2[DeployPhaseStatus2["InProgress"] = 2] = "InProgress";
    DeployPhaseStatus2[DeployPhaseStatus2["PartiallySucceeded"] = 4] = "PartiallySucceeded";
    DeployPhaseStatus2[DeployPhaseStatus2["Succeeded"] = 8] = "Succeeded";
    DeployPhaseStatus2[DeployPhaseStatus2["Failed"] = 16] = "Failed";
    DeployPhaseStatus2[DeployPhaseStatus2["Canceled"] = 32] = "Canceled";
    DeployPhaseStatus2[DeployPhaseStatus2["Skipped"] = 64] = "Skipped";
    DeployPhaseStatus2[DeployPhaseStatus2["Cancelling"] = 128] = "Cancelling";
  })(DeployPhaseStatus || (DeployPhaseStatus = {}));
  var DeployPhaseTypes;
  (function(DeployPhaseTypes2) {
    DeployPhaseTypes2[DeployPhaseTypes2["Undefined"] = 0] = "Undefined";
    DeployPhaseTypes2[DeployPhaseTypes2["AgentBasedDeployment"] = 1] = "AgentBasedDeployment";
    DeployPhaseTypes2[DeployPhaseTypes2["RunOnServer"] = 2] = "RunOnServer";
    DeployPhaseTypes2[DeployPhaseTypes2["MachineGroupBasedDeployment"] = 4] = "MachineGroupBasedDeployment";
    DeployPhaseTypes2[DeployPhaseTypes2["DeploymentGates"] = 8] = "DeploymentGates";
  })(DeployPhaseTypes || (DeployPhaseTypes = {}));
  var EnvironmentStatus;
  (function(EnvironmentStatus2) {
    EnvironmentStatus2[EnvironmentStatus2["Undefined"] = 0] = "Undefined";
    EnvironmentStatus2[EnvironmentStatus2["NotStarted"] = 1] = "NotStarted";
    EnvironmentStatus2[EnvironmentStatus2["InProgress"] = 2] = "InProgress";
    EnvironmentStatus2[EnvironmentStatus2["Succeeded"] = 4] = "Succeeded";
    EnvironmentStatus2[EnvironmentStatus2["Canceled"] = 8] = "Canceled";
    EnvironmentStatus2[EnvironmentStatus2["Rejected"] = 16] = "Rejected";
    EnvironmentStatus2[EnvironmentStatus2["Queued"] = 32] = "Queued";
    EnvironmentStatus2[EnvironmentStatus2["Scheduled"] = 64] = "Scheduled";
    EnvironmentStatus2[EnvironmentStatus2["PartiallySucceeded"] = 128] = "PartiallySucceeded";
  })(EnvironmentStatus || (EnvironmentStatus = {}));
  var EnvironmentTriggerType;
  (function(EnvironmentTriggerType2) {
    EnvironmentTriggerType2[EnvironmentTriggerType2["Undefined"] = 0] = "Undefined";
    EnvironmentTriggerType2[EnvironmentTriggerType2["DeploymentGroupRedeploy"] = 1] = "DeploymentGroupRedeploy";
    EnvironmentTriggerType2[EnvironmentTriggerType2["RollbackRedeploy"] = 2] = "RollbackRedeploy";
  })(EnvironmentTriggerType || (EnvironmentTriggerType = {}));
  var FolderPathQueryOrder;
  (function(FolderPathQueryOrder2) {
    FolderPathQueryOrder2[FolderPathQueryOrder2["None"] = 0] = "None";
    FolderPathQueryOrder2[FolderPathQueryOrder2["Ascending"] = 1] = "Ascending";
    FolderPathQueryOrder2[FolderPathQueryOrder2["Descending"] = 2] = "Descending";
  })(FolderPathQueryOrder || (FolderPathQueryOrder = {}));
  var GateStatus;
  (function(GateStatus2) {
    GateStatus2[GateStatus2["None"] = 0] = "None";
    GateStatus2[GateStatus2["Pending"] = 1] = "Pending";
    GateStatus2[GateStatus2["InProgress"] = 2] = "InProgress";
    GateStatus2[GateStatus2["Succeeded"] = 4] = "Succeeded";
    GateStatus2[GateStatus2["Failed"] = 8] = "Failed";
    GateStatus2[GateStatus2["Canceled"] = 16] = "Canceled";
  })(GateStatus || (GateStatus = {}));
  var IssueSource;
  (function(IssueSource2) {
    IssueSource2[IssueSource2["None"] = 0] = "None";
    IssueSource2[IssueSource2["User"] = 1] = "User";
    IssueSource2[IssueSource2["System"] = 2] = "System";
  })(IssueSource || (IssueSource = {}));
  var MailSectionType;
  (function(MailSectionType2) {
    MailSectionType2[MailSectionType2["Details"] = 0] = "Details";
    MailSectionType2[MailSectionType2["Environments"] = 1] = "Environments";
    MailSectionType2[MailSectionType2["Issues"] = 2] = "Issues";
    MailSectionType2[MailSectionType2["TestResults"] = 3] = "TestResults";
    MailSectionType2[MailSectionType2["WorkItems"] = 4] = "WorkItems";
    MailSectionType2[MailSectionType2["ReleaseInfo"] = 5] = "ReleaseInfo";
  })(MailSectionType || (MailSectionType = {}));
  var ManualInterventionStatus;
  (function(ManualInterventionStatus2) {
    ManualInterventionStatus2[ManualInterventionStatus2["Unknown"] = 0] = "Unknown";
    ManualInterventionStatus2[ManualInterventionStatus2["Pending"] = 1] = "Pending";
    ManualInterventionStatus2[ManualInterventionStatus2["Rejected"] = 2] = "Rejected";
    ManualInterventionStatus2[ManualInterventionStatus2["Approved"] = 4] = "Approved";
    ManualInterventionStatus2[ManualInterventionStatus2["Canceled"] = 8] = "Canceled";
    ManualInterventionStatus2[ManualInterventionStatus2["Bypassed"] = 16] = "Bypassed";
  })(ManualInterventionStatus || (ManualInterventionStatus = {}));
  var ManualInterventionType;
  (function(ManualInterventionType2) {
    ManualInterventionType2[ManualInterventionType2["Task"] = 1] = "Task";
    ManualInterventionType2[ManualInterventionType2["ProofOfPresence"] = 2] = "ProofOfPresence";
  })(ManualInterventionType || (ManualInterventionType = {}));
  var ParallelExecutionTypes;
  (function(ParallelExecutionTypes2) {
    ParallelExecutionTypes2[ParallelExecutionTypes2["None"] = 0] = "None";
    ParallelExecutionTypes2[ParallelExecutionTypes2["MultiConfiguration"] = 1] = "MultiConfiguration";
    ParallelExecutionTypes2[ParallelExecutionTypes2["MultiMachine"] = 2] = "MultiMachine";
  })(ParallelExecutionTypes || (ParallelExecutionTypes = {}));
  var PipelineProcessTypes;
  (function(PipelineProcessTypes2) {
    PipelineProcessTypes2[PipelineProcessTypes2["Designer"] = 1] = "Designer";
    PipelineProcessTypes2[PipelineProcessTypes2["Yaml"] = 2] = "Yaml";
  })(PipelineProcessTypes || (PipelineProcessTypes = {}));
  var PropertySelectorType;
  (function(PropertySelectorType2) {
    PropertySelectorType2[PropertySelectorType2["Inclusion"] = 0] = "Inclusion";
    PropertySelectorType2[PropertySelectorType2["Exclusion"] = 1] = "Exclusion";
  })(PropertySelectorType || (PropertySelectorType = {}));
  var PullRequestSystemType;
  (function(PullRequestSystemType2) {
    PullRequestSystemType2[PullRequestSystemType2["None"] = 0] = "None";
    PullRequestSystemType2[PullRequestSystemType2["TfsGit"] = 1] = "TfsGit";
    PullRequestSystemType2[PullRequestSystemType2["GitHub"] = 2] = "GitHub";
  })(PullRequestSystemType || (PullRequestSystemType = {}));
  var ReleaseDefinitionExpands;
  (function(ReleaseDefinitionExpands2) {
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["None"] = 0] = "None";
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["Environments"] = 2] = "Environments";
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["Artifacts"] = 4] = "Artifacts";
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["Triggers"] = 8] = "Triggers";
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["Variables"] = 16] = "Variables";
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["Tags"] = 32] = "Tags";
    ReleaseDefinitionExpands2[ReleaseDefinitionExpands2["LastRelease"] = 64] = "LastRelease";
  })(ReleaseDefinitionExpands || (ReleaseDefinitionExpands = {}));
  var ReleaseDefinitionQueryOrder;
  (function(ReleaseDefinitionQueryOrder2) {
    ReleaseDefinitionQueryOrder2[ReleaseDefinitionQueryOrder2["IdAscending"] = 0] = "IdAscending";
    ReleaseDefinitionQueryOrder2[ReleaseDefinitionQueryOrder2["IdDescending"] = 1] = "IdDescending";
    ReleaseDefinitionQueryOrder2[ReleaseDefinitionQueryOrder2["NameAscending"] = 2] = "NameAscending";
    ReleaseDefinitionQueryOrder2[ReleaseDefinitionQueryOrder2["NameDescending"] = 3] = "NameDescending";
  })(ReleaseDefinitionQueryOrder || (ReleaseDefinitionQueryOrder = {}));
  var ReleaseDefinitionSource;
  (function(ReleaseDefinitionSource2) {
    ReleaseDefinitionSource2[ReleaseDefinitionSource2["Undefined"] = 0] = "Undefined";
    ReleaseDefinitionSource2[ReleaseDefinitionSource2["RestApi"] = 1] = "RestApi";
    ReleaseDefinitionSource2[ReleaseDefinitionSource2["UserInterface"] = 2] = "UserInterface";
    ReleaseDefinitionSource2[ReleaseDefinitionSource2["Ibiza"] = 4] = "Ibiza";
    ReleaseDefinitionSource2[ReleaseDefinitionSource2["PortalExtensionApi"] = 8] = "PortalExtensionApi";
  })(ReleaseDefinitionSource || (ReleaseDefinitionSource = {}));
  var ReleaseEnvironmentExpands;
  (function(ReleaseEnvironmentExpands2) {
    ReleaseEnvironmentExpands2[ReleaseEnvironmentExpands2["None"] = 0] = "None";
    ReleaseEnvironmentExpands2[ReleaseEnvironmentExpands2["Tasks"] = 1] = "Tasks";
  })(ReleaseEnvironmentExpands || (ReleaseEnvironmentExpands = {}));
  var ReleaseExpands;
  (function(ReleaseExpands2) {
    ReleaseExpands2[ReleaseExpands2["None"] = 0] = "None";
    ReleaseExpands2[ReleaseExpands2["Environments"] = 2] = "Environments";
    ReleaseExpands2[ReleaseExpands2["Artifacts"] = 4] = "Artifacts";
    ReleaseExpands2[ReleaseExpands2["Approvals"] = 8] = "Approvals";
    ReleaseExpands2[ReleaseExpands2["ManualInterventions"] = 16] = "ManualInterventions";
    ReleaseExpands2[ReleaseExpands2["Variables"] = 32] = "Variables";
    ReleaseExpands2[ReleaseExpands2["Tags"] = 64] = "Tags";
  })(ReleaseExpands || (ReleaseExpands = {}));
  var ReleaseQueryOrder;
  (function(ReleaseQueryOrder2) {
    ReleaseQueryOrder2[ReleaseQueryOrder2["Descending"] = 0] = "Descending";
    ReleaseQueryOrder2[ReleaseQueryOrder2["Ascending"] = 1] = "Ascending";
  })(ReleaseQueryOrder || (ReleaseQueryOrder = {}));
  var ReleaseReason;
  (function(ReleaseReason2) {
    ReleaseReason2[ReleaseReason2["None"] = 0] = "None";
    ReleaseReason2[ReleaseReason2["Manual"] = 1] = "Manual";
    ReleaseReason2[ReleaseReason2["ContinuousIntegration"] = 2] = "ContinuousIntegration";
    ReleaseReason2[ReleaseReason2["Schedule"] = 3] = "Schedule";
    ReleaseReason2[ReleaseReason2["PullRequest"] = 4] = "PullRequest";
  })(ReleaseReason || (ReleaseReason = {}));
  var ReleaseStatus;
  (function(ReleaseStatus2) {
    ReleaseStatus2[ReleaseStatus2["Undefined"] = 0] = "Undefined";
    ReleaseStatus2[ReleaseStatus2["Draft"] = 1] = "Draft";
    ReleaseStatus2[ReleaseStatus2["Active"] = 2] = "Active";
    ReleaseStatus2[ReleaseStatus2["Abandoned"] = 4] = "Abandoned";
  })(ReleaseStatus || (ReleaseStatus = {}));
  var ReleaseTriggerType;
  (function(ReleaseTriggerType2) {
    ReleaseTriggerType2[ReleaseTriggerType2["Undefined"] = 0] = "Undefined";
    ReleaseTriggerType2[ReleaseTriggerType2["ArtifactSource"] = 1] = "ArtifactSource";
    ReleaseTriggerType2[ReleaseTriggerType2["Schedule"] = 2] = "Schedule";
    ReleaseTriggerType2[ReleaseTriggerType2["SourceRepo"] = 3] = "SourceRepo";
    ReleaseTriggerType2[ReleaseTriggerType2["ContainerImage"] = 4] = "ContainerImage";
    ReleaseTriggerType2[ReleaseTriggerType2["Package"] = 5] = "Package";
    ReleaseTriggerType2[ReleaseTriggerType2["PullRequest"] = 6] = "PullRequest";
  })(ReleaseTriggerType || (ReleaseTriggerType = {}));
  var ScheduleDays;
  (function(ScheduleDays2) {
    ScheduleDays2[ScheduleDays2["None"] = 0] = "None";
    ScheduleDays2[ScheduleDays2["Monday"] = 1] = "Monday";
    ScheduleDays2[ScheduleDays2["Tuesday"] = 2] = "Tuesday";
    ScheduleDays2[ScheduleDays2["Wednesday"] = 4] = "Wednesday";
    ScheduleDays2[ScheduleDays2["Thursday"] = 8] = "Thursday";
    ScheduleDays2[ScheduleDays2["Friday"] = 16] = "Friday";
    ScheduleDays2[ScheduleDays2["Saturday"] = 32] = "Saturday";
    ScheduleDays2[ScheduleDays2["Sunday"] = 64] = "Sunday";
    ScheduleDays2[ScheduleDays2["All"] = 127] = "All";
  })(ScheduleDays || (ScheduleDays = {}));
  var SenderType;
  (function(SenderType2) {
    SenderType2[SenderType2["ServiceAccount"] = 1] = "ServiceAccount";
    SenderType2[SenderType2["RequestingUser"] = 2] = "RequestingUser";
  })(SenderType || (SenderType = {}));
  var SingleReleaseExpands;
  (function(SingleReleaseExpands2) {
    SingleReleaseExpands2[SingleReleaseExpands2["None"] = 0] = "None";
    SingleReleaseExpands2[SingleReleaseExpands2["Tasks"] = 1] = "Tasks";
  })(SingleReleaseExpands || (SingleReleaseExpands = {}));
  var TaskStatus;
  (function(TaskStatus2) {
    TaskStatus2[TaskStatus2["Unknown"] = 0] = "Unknown";
    TaskStatus2[TaskStatus2["Pending"] = 1] = "Pending";
    TaskStatus2[TaskStatus2["InProgress"] = 2] = "InProgress";
    TaskStatus2[TaskStatus2["Success"] = 3] = "Success";
    TaskStatus2[TaskStatus2["Failure"] = 4] = "Failure";
    TaskStatus2[TaskStatus2["Canceled"] = 5] = "Canceled";
    TaskStatus2[TaskStatus2["Skipped"] = 6] = "Skipped";
    TaskStatus2[TaskStatus2["Succeeded"] = 7] = "Succeeded";
    TaskStatus2[TaskStatus2["Failed"] = 8] = "Failed";
    TaskStatus2[TaskStatus2["PartiallySucceeded"] = 9] = "PartiallySucceeded";
  })(TaskStatus || (TaskStatus = {}));
  var VariableGroupActionFilter;
  (function(VariableGroupActionFilter2) {
    VariableGroupActionFilter2[VariableGroupActionFilter2["None"] = 0] = "None";
    VariableGroupActionFilter2[VariableGroupActionFilter2["Manage"] = 2] = "Manage";
    VariableGroupActionFilter2[VariableGroupActionFilter2["Use"] = 16] = "Use";
  })(VariableGroupActionFilter || (VariableGroupActionFilter = {}));
  var YamlFileSourceTypes;
  (function(YamlFileSourceTypes2) {
    YamlFileSourceTypes2[YamlFileSourceTypes2["None"] = 0] = "None";
    YamlFileSourceTypes2[YamlFileSourceTypes2["TFSGit"] = 1] = "TFSGit";
  })(YamlFileSourceTypes || (YamlFileSourceTypes = {}));

  // node_modules/whatwg-fetch/fetch.js
  var support = {
    searchParams: "URLSearchParams" in self,
    iterable: "Symbol" in self && "iterator" in Symbol,
    blob: "FileReader" in self && "Blob" in self && (function() {
      try {
        new Blob();
        return true;
      } catch (e2) {
        return false;
      }
    })(),
    formData: "FormData" in self,
    arrayBuffer: "ArrayBuffer" in self
  };
  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj);
  }
  if (support.arrayBuffer) {
    viewClasses = [
      "[object Int8Array]",
      "[object Uint8Array]",
      "[object Uint8ClampedArray]",
      "[object Int16Array]",
      "[object Uint16Array]",
      "[object Int32Array]",
      "[object Uint32Array]",
      "[object Float32Array]",
      "[object Float64Array]"
    ];
    isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
    };
  }
  var viewClasses;
  var isArrayBufferView;
  function normalizeName(name) {
    if (typeof name !== "string") {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === "") {
      throw new TypeError("Invalid character in header field name");
    }
    return name.toLowerCase();
  }
  function normalizeValue(value) {
    if (typeof value !== "string") {
      value = String(value);
    }
    return value;
  }
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return { done: value === void 0, value };
      }
    };
    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator;
      };
    }
    return iterator;
  }
  function Headers2(headers) {
    this.map = {};
    if (headers instanceof Headers2) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }
  Headers2.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ", " + value : value;
  };
  Headers2.prototype["delete"] = function(name) {
    delete this.map[normalizeName(name)];
  };
  Headers2.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null;
  };
  Headers2.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name));
  };
  Headers2.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };
  Headers2.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };
  Headers2.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items);
  };
  Headers2.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items);
  };
  Headers2.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items);
  };
  if (support.iterable) {
    Headers2.prototype[Symbol.iterator] = Headers2.prototype.entries;
  }
  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError("Already read"));
    }
    body.bodyUsed = true;
  }
  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    });
  }
  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise;
  }
  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise;
  }
  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);
    for (var i2 = 0; i2 < view.length; i2++) {
      chars[i2] = String.fromCharCode(view[i2]);
    }
    return chars.join("");
  }
  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0);
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer;
    }
  }
  function Body() {
    this.bodyUsed = false;
    this._initBody = function(body) {
      this.bodyUsed = this.bodyUsed;
      this._bodyInit = body;
      if (!body) {
        this._bodyText = "";
      } else if (typeof body === "string") {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }
      if (!this.headers.get("content-type")) {
        if (typeof body === "string") {
          this.headers.set("content-type", "text/plain;charset=UTF-8");
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set("content-type", this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
        }
      }
    };
    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }
        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob);
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]));
        } else if (this._bodyFormData) {
          throw new Error("could not read FormData body as blob");
        } else {
          return Promise.resolve(new Blob([this._bodyText]));
        }
      };
      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
        } else {
          return this.blob().then(readBlobAsArrayBuffer);
        }
      };
    }
    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected;
      }
      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob);
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
      } else if (this._bodyFormData) {
        throw new Error("could not read FormData body as text");
      } else {
        return Promise.resolve(this._bodyText);
      }
    };
    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode);
      };
    }
    this.json = function() {
      return this.text().then(JSON.parse);
    };
    return this;
  }
  var methods = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];
  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method;
  }
  function Request(input, options) {
    options = options || {};
    var body = options.body;
    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError("Already read");
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers2(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }
    this.credentials = options.credentials || this.credentials || "same-origin";
    if (options.headers || !this.headers) {
      this.headers = new Headers2(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || "GET");
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;
    if ((this.method === "GET" || this.method === "HEAD") && body) {
      throw new TypeError("Body not allowed for GET or HEAD requests");
    }
    this._initBody(body);
  }
  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit });
  };
  function decode(body) {
    var form = new FormData();
    body.trim().split("&").forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split("=");
        var name = split.shift().replace(/\+/g, " ");
        var value = split.join("=").replace(/\+/g, " ");
        form.append(decodeURIComponent(name), decodeURIComponent(value));
      }
    });
    return form;
  }
  function parseHeaders(rawHeaders) {
    var headers = new Headers2();
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, " ");
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(":");
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(":").trim();
        headers.append(key, value);
      }
    });
    return headers;
  }
  Body.call(Request.prototype);
  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }
    this.type = "default";
    this.status = options.status === void 0 ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = "statusText" in options ? options.statusText : "";
    this.headers = new Headers2(options.headers);
    this.url = options.url || "";
    this._initBody(bodyInit);
  }
  Body.call(Response.prototype);
  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers2(this.headers),
      url: this.url
    });
  };
  Response.error = function() {
    var response = new Response(null, { status: 0, statusText: "" });
    response.type = "error";
    return response;
  };
  var redirectStatuses = [301, 302, 303, 307, 308];
  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError("Invalid status code");
    }
    return new Response(null, { status, headers: { location: url } });
  };
  var DOMException = self.DOMException;
  try {
    new DOMException();
  } catch (err) {
    DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    DOMException.prototype = Object.create(Error.prototype);
    DOMException.prototype.constructor = DOMException;
  }
  function fetch2(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);
      if (request.signal && request.signal.aborted) {
        return reject(new DOMException("Aborted", "AbortError"));
      }
      var xhr = new XMLHttpRequest();
      function abortXhr() {
        xhr.abort();
      }
      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || "")
        };
        options.url = "responseURL" in xhr ? xhr.responseURL : options.headers.get("X-Request-URL");
        var body = "response" in xhr ? xhr.response : xhr.responseText;
        setTimeout(function() {
          resolve(new Response(body, options));
        }, 0);
      };
      xhr.onerror = function() {
        setTimeout(function() {
          reject(new TypeError("Network request failed"));
        }, 0);
      };
      xhr.ontimeout = function() {
        setTimeout(function() {
          reject(new TypeError("Network request failed"));
        }, 0);
      };
      xhr.onabort = function() {
        setTimeout(function() {
          reject(new DOMException("Aborted", "AbortError"));
        }, 0);
      };
      function fixUrl(url) {
        try {
          return url === "" && self.location.href ? self.location.href : url;
        } catch (e2) {
          return url;
        }
      }
      xhr.open(request.method, fixUrl(request.url), true);
      if (request.credentials === "include") {
        xhr.withCredentials = true;
      } else if (request.credentials === "omit") {
        xhr.withCredentials = false;
      }
      if ("responseType" in xhr) {
        if (support.blob) {
          xhr.responseType = "blob";
        } else if (support.arrayBuffer && request.headers.get("Content-Type") && request.headers.get("Content-Type").indexOf("application/octet-stream") !== -1) {
          xhr.responseType = "arraybuffer";
        }
      }
      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });
      if (request.signal) {
        request.signal.addEventListener("abort", abortXhr);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            request.signal.removeEventListener("abort", abortXhr);
          }
        };
      }
      xhr.send(typeof request._bodyInit === "undefined" ? null : request._bodyInit);
    });
  }
  fetch2.polyfill = true;
  if (!self.fetch) {
    self.fetch = fetch2;
    self.Headers = Headers2;
    self.Request = Request;
    self.Response = Response;
  }

  // node_modules/azure-devops-extension-api/esm/Common/Fetch.js
  async function issueRequest(requestUrl, options, vssRequestOptions) {
    let response = void 0;
    if (!options) {
      options = {};
    }
    let headers;
    if (options.headers) {
      if (options.headers instanceof Headers) {
        headers = options.headers;
      } else {
        headers = new Headers();
        if (typeof options.headers.hasOwnProperty === "function") {
          for (const key in options.headers) {
            if (options.headers.hasOwnProperty(key)) {
              headers.append(key, options.headers[key]);
            }
          }
        }
      }
    } else {
      headers = new Headers();
    }
    options.headers = headers;
    headers.append("X-VSS-ReauthenticationAction", "Suppress");
    if (vssRequestOptions) {
      const sessionId = vssRequestOptions.sessionId;
      const command = vssRequestOptions.command;
      if (sessionId) {
        if (command) {
          headers.append("X-TFS-Session", sessionId + "," + command);
        } else {
          headers.append("X-TFS-Session", sessionId);
        }
      }
    }
    options.credentials = "same-origin";
    let refreshToken = false;
    let retried = false;
    while (true) {
      if (vssRequestOptions && vssRequestOptions.authTokenProvider) {
        const authHeader = await vssRequestOptions.authTokenProvider.getAuthorizationHeader(refreshToken);
        if (authHeader) {
          headers.set("Authorization", authHeader);
        }
        headers.set("X-TFS-FedAuthRedirect", "Suppress");
      }
      try {
        response = await fetch(requestUrl, options);
      } catch (ex) {
        console.warn(`Unhandled exception in fetch for ${requestUrl}: ${ex && ex.toString()}`);
        const error = new Error("TF400893: Unable to contact the server. Please check your network connection and try again.");
        error.name = "NetworkException";
        throw error;
      }
      if (response.status === 401 && !retried && vssRequestOptions && vssRequestOptions.authTokenProvider) {
        retried = true;
        refreshToken = true;
        continue;
      }
      break;
    }
    if (!response.ok) {
      const error = new Error();
      error.name = "TFS.WebApi.Exception";
      error.status = response.status;
      error.responseText = await response.text();
      if (error.responseText && error.responseText !== "") {
        try {
          error.serverError = JSON.parse(error.responseText);
          if (error.serverError && error.serverError.message) {
            error.message = error.serverError.message;
          }
        } catch (exception) {
        }
      }
      if (!error.message) {
        error.message = response.status + ": " + response.statusText;
      }
      throw error;
    }
    return response;
  }

  // node_modules/azure-devops-extension-api/esm/Common/Util/Serialization.js
  var msAjaxDateRegEx = new RegExp('(^|[^\\\\])\\"\\\\/Date\\((-?[0-9]+)(?:[a-zA-Z]|(?:\\+|-)[0-9]{4})?\\)\\\\/\\"', "g");
  function deserializeVssJsonObject(text) {
    function replaceMsJsonDates(object, parentObject, parentObjectKey) {
      if (parentObject && typeof object.__msjson_date__ === "number") {
        parentObject[parentObjectKey] = new Date(object.__msjson_date__);
        return;
      }
      for (let key in object) {
        const value = object[key];
        if (value !== null && typeof value === "object") {
          replaceMsJsonDates(object[key], object, key);
        }
      }
    }
    let deserializedData = null;
    if (text) {
      const replacedText = text.replace(msAjaxDateRegEx, '$1{"__msjson_date__":$2 }');
      deserializedData = JSON.parse(replacedText);
      if (replacedText !== text) {
        replaceMsJsonDates(deserializedData, null, "");
      }
    }
    return deserializedData;
  }

  // node_modules/azure-devops-extension-api/esm/Common/Util/Url.js
  var KeyCodes;
  (function(KeyCodes2) {
    KeyCodes2[KeyCodes2["asterisk"] = 42] = "asterisk";
    KeyCodes2[KeyCodes2["endCurlyBrace"] = 125] = "endCurlyBrace";
    KeyCodes2[KeyCodes2["startCurlyBrace"] = 123] = "startCurlyBrace";
  })(KeyCodes || (KeyCodes = {}));
  function prepareForComparison(value, upperCase) {
    return value ? upperCase ? value.toLocaleUpperCase() : value : "";
  }
  function stringEquals(str1, str2, ignoreCase) {
    if (str1 === str2) {
      return true;
    }
    return prepareForComparison(str1, ignoreCase).localeCompare(prepareForComparison(str2, ignoreCase)) === 0;
  }
  var Uri = class {
    /**
    * Create a new Uri.
    *
    * @param uri Optional uri string to populate values with
    * @param options Options for parsing the uri string
    */
    constructor(uri, options) {
      this.scheme = "";
      this.noSchemeSeparator = false;
      this.host = "";
      this.port = 0;
      this.path = "";
      this.queryParameters = [];
      this.hashString = "";
      if (uri) {
        this._setFromUriString(uri, options);
      }
    }
    _setFromUriString(uriString, options) {
      let uri = uriString;
      let hashSplit = this._singleSplit(uri, "#");
      if (hashSplit) {
        uri = hashSplit.part1;
        this.hashString = this._decodeUriComponent(hashSplit.part2);
      } else {
        this.hashString = "";
      }
      let querySplit = this._singleSplit(uri, "?");
      if (querySplit) {
        uri = querySplit.part1;
        this.queryString = querySplit.part2;
      } else {
        this.queryParameters = [];
      }
      this.scheme = "";
      this.host = "";
      this.port = 0;
      this.path = "";
      this.noSchemeSeparator = false;
      const schemeSplit = this._singleSplit(uri, ":");
      if (schemeSplit) {
        this.scheme = schemeSplit.part1;
        uri = schemeSplit.part2;
        if (uri.substr(0, 2) === "//") {
          uri = uri.substr(2);
          const pathSplit = this._singleSplit(uri, "/");
          if (pathSplit) {
            uri = pathSplit.part1;
            this.path = pathSplit.part2;
          } else {
            this.path = "";
          }
          const portSplit = this._singleSplit(uri, ":");
          if (portSplit) {
            this.host = portSplit.part1;
            this.port = parseInt(portSplit.part2);
            if (isNaN(this.port)) {
              this.host += ":";
              this.path = portSplit.part2 + "/" + this.path;
            }
          } else {
            this.host = uri;
          }
        } else {
          this.noSchemeSeparator = true;
          this.path = uri;
        }
      } else {
        this.path = uri;
      }
      if (options && options.absoluteUriRequired && !this.scheme) {
        throw new Error(`The uri string "${uriString}" does not represent a valid absolute uri.`);
      }
    }
    _singleSplit(value, separator) {
      const matchIndex = value.indexOf(separator);
      if (matchIndex >= 0) {
        return {
          part1: value.substr(0, matchIndex),
          part2: value.substr(matchIndex + 1)
        };
      } else {
        return void 0;
      }
    }
    _decodeUriComponent(value) {
      if (value) {
        value = value.replace(/\+/g, "%20");
        value = decodeURIComponent(value);
      }
      return value;
    }
    /**
    * Get the absolute uri string for this Uri
    */
    get absoluteUri() {
      let uri = "";
      if (this.scheme) {
        uri = encodeURI(decodeURI(this.scheme)) + ":";
        if (!this.noSchemeSeparator) {
          uri += "//";
        }
      }
      if (this.host) {
        uri += encodeURI(decodeURI(this.host));
        if (this.port) {
          uri += ":" + this.port;
        }
        if (!this.noSchemeSeparator || this.path) {
          uri += "/";
        }
      }
      if (this.path) {
        let encodedPath;
        if (this.noSchemeSeparator) {
          encodedPath = encodeURI(decodeURI(this.path));
        } else {
          const parts = this.path.split("/");
          encodedPath = parts.map((p2) => encodeURIComponent(decodeURIComponent(p2))).join("/");
        }
        if (this.host) {
          uri = combineUrlPaths(uri, encodedPath);
        } else {
          uri = uri + encodedPath;
        }
      }
      const queryString = this.queryString;
      if (queryString) {
        uri += "?" + queryString;
      }
      if (this.hashString) {
        const params = this._splitStringIntoParams(this.hashString);
        const encodedString = this._getParamsAsString(params);
        uri += "#" + encodedString;
      }
      return uri;
    }
    /**
    * Set the absolute uri string for this Uri. Replaces all existing values
    */
    set absoluteUri(uri) {
      this._setFromUriString(uri || "");
    }
    /**
     * Gets the effective port number, returning the default port number if omitted for the given scheme.
     */
    getEffectivePort() {
      if (this.port) {
        return this.port;
      } else {
        if (stringEquals(this.scheme, "http", true)) {
          return 80;
        } else if (stringEquals(this.scheme, "https", true)) {
          return 443;
        } else {
          return 0;
        }
      }
    }
    /**
     * Builds an encoded key/value pair string
     * like query string or hash strings
     */
    _getParamsAsString(params) {
      if (params && params.length) {
        return params.map((param) => {
          if (param.value !== null) {
            return encodeURIComponent(param.name) + "=" + encodeURIComponent(param.value);
          } else {
            return encodeURIComponent(param.name);
          }
        }).join("&");
      } else {
        return "";
      }
    }
    /**
    * Get the query string for this Uri.
    */
    get queryString() {
      return this._getParamsAsString(this.queryParameters);
    }
    /**
    * Set the query string for this Uri. Replaces existing value
    */
    set queryString(queryString) {
      this.queryParameters = this._splitStringIntoParams(queryString);
    }
    /**
     * Coverts a key/value pair string into parameters array
     * @param paramString String such as a=b&c=d
     */
    _splitStringIntoParams(paramString) {
      let params = [];
      paramString.split("&").forEach((pair) => {
        if (pair) {
          const valueSplit = this._singleSplit(pair, "=");
          if (valueSplit) {
            params.push({
              name: this._decodeUriComponent(valueSplit.part1),
              value: this._decodeUriComponent(valueSplit.part2)
            });
          } else {
            params.push({
              name: this._decodeUriComponent(pair),
              value: null
            });
          }
        }
      });
      return params;
    }
    /**
    * Get the value of the query parameter with the given key
    *
    * @param name Query parameter name
    */
    getQueryParam(name) {
      let value;
      if (this.queryParameters) {
        let matchingPairs = this.queryParameters.filter((p2) => stringEquals(p2.name, name, true));
        if (matchingPairs.length > 0) {
          value = matchingPairs[0].value;
        }
      }
      return value;
    }
    /**
     * Adds a query string parameter to the current uri
     *
     * @param name The Query parameter name
     * @param value The Query parameter value
     * @param replaceExisting If true, replace all existing parameters with the same name
     */
    addQueryParam(name, value, replaceExisting) {
      if (replaceExisting) {
        this.removeQueryParam(name);
      }
      if (!this.queryParameters) {
        this.queryParameters = [];
      }
      this.queryParameters.push({ name, value });
    }
    /**
     * Adds query string parameters to the current uri
     *
     * @param parameters Query parameters to add
     * @param replaceExisting If true, replace all existing parameters with the same name
     * @param keyPrefix If specified, a value to prepend to all query parameter keys
     */
    addQueryParams(parameters, replaceExisting, keyPrefix) {
      for (const key in parameters) {
        const value = parameters[key];
        if (value !== null && value !== void 0) {
          const keyWithPrefix = (keyPrefix || "") + key;
          if (value instanceof Date) {
            this.addQueryParam(keyWithPrefix, value.toJSON(), replaceExisting);
          } else if (Array.isArray(value)) {
            value.forEach((v2) => this.addQueryParam(keyWithPrefix, "" + v2, replaceExisting));
          } else if (typeof value === "object") {
            this.addQueryParams(value, replaceExisting, keyWithPrefix + ".");
          } else {
            this.addQueryParam(keyWithPrefix, "" + value, replaceExisting);
          }
        }
      }
    }
    /**
     * Removes a query string parameter
     *
     * @param name The Query parameter name
     */
    removeQueryParam(name) {
      if (this.queryParameters) {
        this.queryParameters = this.queryParameters.filter((p2) => !stringEquals(p2.name, name, true));
      }
    }
  };
  function combineUrlPaths(...paths) {
    let segmentsToJoin = [];
    for (let i2 = 0, last = paths.length - 1; i2 <= last; i2++) {
      let path = paths[i2];
      if (path) {
        if (path === "/" && (i2 === 0 || i2 === last)) {
          segmentsToJoin.push("");
        } else {
          if (i2 > 0 && path[0] === "/") {
            path = path.substr(1);
          }
          if (i2 < last && path[path.length - 1] === "/") {
            path = path.substr(0, path.length - 1);
          }
          if (path) {
            segmentsToJoin.push(path);
          }
        }
      }
    }
    if (segmentsToJoin.length === 1 && segmentsToJoin[0] === "") {
      return "/";
    }
    return segmentsToJoin.join("/");
  }
  function parseRouteTemplate(routeTemplate) {
    const parsedRoute = {
      segments: []
    };
    let paramStartIndex = -1;
    let segmentStartIndex = -1;
    let segmentPrefix = "";
    for (let charIndex = 0, routeTemplateLen = routeTemplate.length; charIndex < routeTemplateLen; charIndex++) {
      let c = routeTemplate.charCodeAt(charIndex);
      if (paramStartIndex >= 0) {
        if (c === 125) {
          let paramName = routeTemplate.substring(paramStartIndex, charIndex);
          let isWildCardParam = false;
          if (paramName.charCodeAt(0) === 42) {
            paramName = paramName.substr(1);
            isWildCardParam = true;
          }
          parsedRoute.segments.push({
            paramName,
            isWildCardParam
          });
          paramStartIndex = -1;
        }
      } else {
        if (c === 123 && routeTemplate.charCodeAt(charIndex + 1) !== 123) {
          if (segmentPrefix || segmentStartIndex >= 0) {
            let segmentText = segmentPrefix;
            if (segmentStartIndex >= 0) {
              segmentText += routeTemplate.substring(segmentStartIndex, charIndex);
            }
            if (segmentText) {
              parsedRoute.segments.push({
                text: segmentText
              });
            }
            segmentStartIndex = -1;
            segmentPrefix = "";
          }
          paramStartIndex = charIndex + 1;
        } else {
          if (c === 123 && routeTemplate.charCodeAt(charIndex + 1) === 123 || c === 125 && routeTemplate.charCodeAt(charIndex + 1) === 125) {
            segmentPrefix = segmentPrefix + routeTemplate.substring(segmentStartIndex >= 0 ? segmentStartIndex : charIndex, charIndex + 1);
            segmentStartIndex = -1;
            charIndex++;
          }
          if (segmentStartIndex < 0) {
            segmentStartIndex = charIndex;
          }
        }
      }
    }
    if (segmentStartIndex >= 0 || paramStartIndex >= 0) {
      const segmentText = segmentPrefix + routeTemplate.substring(segmentStartIndex >= 0 ? segmentStartIndex : paramStartIndex);
      if (segmentText) {
        parsedRoute.segments.push({
          text: segmentText
        });
      }
    }
    let required = false;
    for (let i2 = parsedRoute.segments.length - 1; i2 >= 0; i2--) {
      let segment = parsedRoute.segments[i2];
      if (segment.text && segment.text !== "/") {
        required = true;
      } else if (required && segment.paramName) {
        segment.isRequiredParam = true;
      }
    }
    return parsedRoute;
  }
  function replaceParsedRouteValues(parsedRoute, routeValues, continueOnUnmatchedSegements) {
    let urlParts = [];
    let matchedParameters = {};
    let matchedParametersCount = 0;
    for (let segmentIndex = 0, l2 = parsedRoute.segments.length; segmentIndex < l2; segmentIndex++) {
      const segment = parsedRoute.segments[segmentIndex];
      if (segment.text) {
        let segmentText = segment.text;
        if (continueOnUnmatchedSegements) {
          if (segmentIndex > 0 && segmentText.charAt(0) === "/") {
            if (urlParts.length === 0) {
              segmentText = segmentText.substr(1);
            }
          }
        }
        if (segmentText) {
          urlParts.push(segmentText);
        }
      } else {
        const value = routeValues[segment.paramName];
        if (!value && value !== 0) {
          if (!continueOnUnmatchedSegements) {
            if (segment.isRequiredParam) {
              return void 0;
            } else {
              break;
            }
          } else if (urlParts.length) {
            let lastSegment = urlParts[urlParts.length - 1];
            if (lastSegment[lastSegment.length - 1] === "/") {
              urlParts[urlParts.length - 1] = lastSegment.substr(0, lastSegment.length - 1);
            }
          }
        } else {
          urlParts.push(segment.isWildCardParam ? encodeURI("" + value) : encodeURIComponent("" + value));
          matchedParameters[segment.paramName] = true;
          matchedParametersCount++;
        }
      }
    }
    return {
      url: urlParts.join(""),
      matchedParameters,
      matchedParametersCount
    };
  }
  function replaceRouteValues(routeTemplate, routeValues) {
    let parsedRoute = parseRouteTemplate(routeTemplate);
    return replaceParsedRouteValues(parsedRoute, routeValues, true).url;
  }

  // node_modules/azure-devops-extension-api/esm/Common/RestClientBase.js
  var RestClientBase = class {
    constructor(options) {
      this._options = options || {};
      if (typeof this._options.rootPath === "string") {
        this._rootPath = Promise.resolve(this._options.rootPath);
      } else {
        this._rootPath = this._options.rootPath || Promise.resolve("/");
      }
    }
    /**
    * Gets the root path of the Service
    *
    * @returns Promise for the resolving the root path of the service.
    */
    async getRootPath() {
      return this._rootPath;
    }
    /**
    * Issue a request to a VSS REST endpoint.
    *
    * @param requestParams request options
    * @returns Promise for the response
    */
    async beginRequest(requestParams) {
      return this._rootPath.then((rootPath) => {
        let requestUrl = rootPath + replaceRouteValues(requestParams.routeTemplate, requestParams.routeValues || {});
        if (requestParams.queryParams) {
          const uri = new Uri(requestUrl);
          uri.addQueryParams(requestParams.queryParams);
          requestUrl = uri.absoluteUri;
        }
        return this._issueRequest(requestUrl, requestParams.apiVersion, requestParams);
      });
    }
    /**
     * Issue a request to a VSS REST endpoint at the specified location
     *
     * @param requestUrl Resolved URL of the request
     * @param apiVersion API version
     * @param requestParams Optional request parameters
     */
    _issueRequest(requestUrl, apiVersion, requestParams) {
      let fetchOptions = {};
      fetchOptions.method = requestParams.method || "GET";
      fetchOptions.mode = "cors";
      if (!requestParams.isRawData && requestParams.body && fetchOptions.method.toUpperCase() !== "GET") {
        fetchOptions.body = JSON.stringify(requestParams.body);
      } else {
        fetchOptions.body = requestParams.body;
      }
      let acceptType = requestParams.httpResponseType || "application/json";
      let acceptHeaderValue = `${acceptType};api-version=${apiVersion};excludeUrls=true;enumsAsNumbers=true;msDateFormat=true;noArrayWrap=true`;
      fetchOptions.headers = Object.assign({
        "Accept": acceptHeaderValue,
        "Content-Type": requestParams.body && "application/json"
      }, requestParams.customHeaders);
      let vssRequestOptions = {
        authTokenProvider: this._options.authTokenProvider,
        sessionId: this._options.sessionId,
        command: requestParams.command || this._options.command
      };
      let result = issueRequest(requestUrl, fetchOptions, vssRequestOptions);
      return result.then((response) => {
        if (requestParams.returnRawResponse) {
          return response;
        } else if (acceptType.toLowerCase().indexOf("json") >= 0) {
          return response.text().then(deserializeVssJsonObject);
        } else if (acceptType.toLowerCase() === "text/plain") {
          return response.text();
        } else {
          return response.arrayBuffer();
        }
      });
    }
  };

  // node_modules/azure-devops-extension-api/esm/Release/ReleaseClient.js
  var ReleaseRestClient = class extends RestClientBase {
    constructor(options) {
      super(options);
    }
    /**
     * Returns the artifact details that automation agent requires
     *
     * @param project - Project ID or project name
     * @param releaseId -
     */
    async getAgentArtifactDefinitions(project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/agentartifacts",
        routeValues: {
          project,
          releaseId
        }
      });
    }
    /**
     * Get a list of approvals
     *
     * @param project - Project ID or project name
     * @param assignedToFilter - Approvals assigned to this user.
     * @param statusFilter - Approvals with this status. Default is 'pending'.
     * @param releaseIdsFilter - Approvals for release id(s) mentioned in the filter. Multiple releases can be mentioned by separating them with ',' e.g. releaseIdsFilter=1,2,3,4.
     * @param typeFilter - Approval with this type.
     * @param top - Number of approvals to get. Default is 50.
     * @param continuationToken - Gets the approvals after the continuation token provided.
     * @param queryOrder - Gets the results in the defined order of created approvals. Default is 'descending'.
     * @param includeMyGroupApprovals - 'true' to include my group approvals. Default is 'false'.
     */
    async getApprovals(project, assignedToFilter, statusFilter, releaseIdsFilter, typeFilter, top, continuationToken, queryOrder, includeMyGroupApprovals) {
      const queryValues = {
        assignedToFilter,
        statusFilter,
        releaseIdsFilter: releaseIdsFilter && releaseIdsFilter.join(","),
        typeFilter,
        top,
        continuationToken,
        queryOrder,
        includeMyGroupApprovals
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.3",
        routeTemplate: "{project}/_apis/Release/approvals",
        routeValues: {
          project
        },
        queryParams: queryValues,
        returnRawResponse: true
      }).then(async (response) => {
        const body = await response.text().then(deserializeVssJsonObject);
        body.continuationToken = response.headers.get("x-ms-continuationtoken");
        return body;
      });
    }
    /**
     * Get approval history.
     *
     * @param project - Project ID or project name
     * @param approvalStepId - Id of the approval.
     */
    async getApprovalHistory(project, approvalStepId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.3",
        routeTemplate: "{project}/_apis/Release/approvals/{approvalStepId}/history",
        routeValues: {
          project,
          approvalStepId
        }
      });
    }
    /**
     * Get an approval.
     *
     * @param project - Project ID or project name
     * @param approvalId - Id of the approval.
     * @param includeHistory - 'true' to include history of the approval. Default is 'false'.
     */
    async getApproval(project, approvalId, includeHistory) {
      const queryValues = {
        includeHistory
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.3",
        routeTemplate: "{project}/_apis/Release/approvals/{approvalId}",
        routeValues: {
          project,
          approvalId
        },
        queryParams: queryValues
      });
    }
    /**
     * Update status of an approval
     *
     * @param approval - ReleaseApproval object having status, approver and comments.
     * @param project - Project ID or project name
     * @param approvalId - Id of the approval.
     */
    async updateReleaseApproval(approval, project, approvalId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.3",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/approvals/{approvalId}",
        routeValues: {
          project,
          approvalId
        },
        body: approval
      });
    }
    /**
     * @param approvals -
     * @param project - Project ID or project name
     */
    async updateReleaseApprovals(approvals, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.3",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/approvals",
        routeValues: {
          project
        },
        body: approvals
      });
    }
    /**
     * Get a task attachment.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of the release environment.
     * @param attemptId - Attempt number of deployment.
     * @param timelineId - Timeline Id of the task.
     * @param recordId - Record Id of attachment.
     * @param type - Type of the attachment.
     * @param name - Name of the attachment.
     */
    async getTaskAttachmentContent(project, releaseId, environmentId, attemptId, timelineId, recordId, type, name) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        httpResponseType: "application/octet-stream",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/attempts/{attemptId}/timelines/{timelineId}/records/{recordId}/attachments/{type}/{name}",
        routeValues: {
          project,
          releaseId,
          environmentId,
          attemptId,
          timelineId,
          recordId,
          type,
          name
        }
      });
    }
    /**
     * Get a release task attachment.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of the release environment.
     * @param attemptId - Attempt number of deployment.
     * @param planId - Plan Id of the deploy phase.
     * @param timelineId - Timeline Id of the task.
     * @param recordId - Record Id of attachment.
     * @param type - Type of the attachment.
     * @param name - Name of the attachment.
     */
    async getReleaseTaskAttachmentContent(project, releaseId, environmentId, attemptId, planId, timelineId, recordId, type, name) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        httpResponseType: "application/octet-stream",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/attempts/{attemptId}/plan/{planId}/timelines/{timelineId}/records/{recordId}/attachments/{type}/{name}",
        routeValues: {
          project,
          releaseId,
          environmentId,
          attemptId,
          planId,
          timelineId,
          recordId,
          type,
          name
        }
      });
    }
    /**
     * Get the task attachments.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of the release environment.
     * @param attemptId - Attempt number of deployment.
     * @param timelineId - Timeline Id of the task.
     * @param type - Type of the attachment.
     */
    async getTaskAttachments(project, releaseId, environmentId, attemptId, timelineId, type) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/attempts/{attemptId}/timelines/{timelineId}/attachments/{type}",
        routeValues: {
          project,
          releaseId,
          environmentId,
          attemptId,
          timelineId,
          type
        }
      });
    }
    /**
     * Get the release task attachments.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of the release environment.
     * @param attemptId - Attempt number of deployment.
     * @param planId - Plan Id of the deploy phase.
     * @param type - Type of the attachment.
     */
    async getReleaseTaskAttachments(project, releaseId, environmentId, attemptId, planId, type) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/attempts/{attemptId}/plan/{planId}/attachments/{type}",
        routeValues: {
          project,
          releaseId,
          environmentId,
          attemptId,
          planId,
          type
        }
      });
    }
    /**
     * @param artifactType -
     * @param sourceId -
     * @param artifactVersionId -
     * @param project - Project ID or project name
     */
    async getAutoTriggerIssues(artifactType, sourceId, artifactVersionId, project) {
      const queryValues = {
        artifactType,
        sourceId,
        artifactVersionId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/autotriggerissues",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets a badge that indicates the status of the most recent deployment for an environment.
     *
     * @param projectId - The ID of the Project.
     * @param releaseDefinitionId - The ID of the Release Definition.
     * @param environmentId - The ID of the Environment.
     * @param branchName - The name of the branch.
     */
    async getDeploymentBadge(projectId, releaseDefinitionId, environmentId, branchName) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "_apis/public/Release/badge/{projectId}/{releaseDefinitionId}/{environmentId}/{branchName}",
        routeValues: {
          projectId,
          releaseDefinitionId,
          environmentId,
          branchName
        }
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     * @param baseReleaseId -
     * @param top -
     * @param artifactAlias -
     */
    async getReleaseChanges(project, releaseId, baseReleaseId, top, artifactAlias) {
      const queryValues = {
        baseReleaseId,
        "$top": top,
        artifactAlias
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/changes",
        routeValues: {
          project,
          releaseId
        },
        queryParams: queryValues
      });
    }
    /**
     * @param project - Project ID or project name
     * @param taskGroupId -
     * @param propertyFilters -
     */
    async getDefinitionEnvironments(project, taskGroupId, propertyFilters) {
      const queryValues = {
        taskGroupId,
        propertyFilters: propertyFilters && propertyFilters.join(",")
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/definitionEnvironments",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Create a release definition
     *
     * @param releaseDefinition - release definition object to create.
     * @param project - Project ID or project name
     */
    async createReleaseDefinition(releaseDefinition, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project
        },
        body: releaseDefinition
      });
    }
    /**
     * Delete a release definition.
     *
     * @param project - Project ID or project name
     * @param definitionId - Id of the release definition.
     * @param comment - Comment for deleting a release definition.
     * @param forceDelete - 'true' to automatically cancel any in-progress release deployments and proceed with release definition deletion . Default is 'false'.
     */
    async deleteReleaseDefinition(project, definitionId, comment, forceDelete) {
      const queryValues = {
        comment,
        forceDelete
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project,
          definitionId
        },
        queryParams: queryValues
      });
    }
    /**
     * Get a release definition.
     *
     * @param project - Project ID or project name
     * @param definitionId - Id of the release definition.
     * @param propertyFilters - A comma-delimited list of extended properties to be retrieved. If set, the returned Release Definition will contain values for the specified property Ids (if they exist). If not set, properties will not be included.
     * @param includeDisabled - Boolean flag to include disabled definitions.
     */
    async getReleaseDefinition(project, definitionId, propertyFilters, includeDisabled) {
      const queryValues = {
        propertyFilters: propertyFilters && propertyFilters.join(","),
        includeDisabled
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project,
          definitionId
        },
        queryParams: queryValues
      });
    }
    /**
     * Get release definition of a given revision.
     *
     * @param project - Project ID or project name
     * @param definitionId - Id of the release definition.
     * @param revision - Revision number of the release definition.
     */
    async getReleaseDefinitionRevision(project, definitionId, revision) {
      const queryValues = {
        revision
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project,
          definitionId
        },
        queryParams: queryValues
      });
    }
    /**
     * Get a list of release definitions.
     *
     * @param project - Project ID or project name
     * @param searchText - Get release definitions with names containing searchText.
     * @param expand - The properties that should be expanded in the list of Release definitions.
     * @param artifactType - Release definitions with given artifactType will be returned. Values can be Build, Jenkins, GitHub, Nuget, Team Build (external), ExternalTFSBuild, Git, TFVC, ExternalTfsXamlBuild.
     * @param artifactSourceId - Release definitions with given artifactSourceId will be returned. e.g. For build it would be \{projectGuid\}:\{BuildDefinitionId\}, for Jenkins it would be \{JenkinsConnectionId\}:\{JenkinsDefinitionId\}, for TfsOnPrem it would be \{TfsOnPremConnectionId\}:\{ProjectName\}:\{TfsOnPremDefinitionId\}. For third-party artifacts e.g. TeamCity, BitBucket you may refer 'uniqueSourceIdentifier' inside vss-extension.json at https://github.com/Microsoft/vsts-rm-extensions/blob/master/Extensions.
     * @param top - Number of release definitions to get.
     * @param continuationToken - Gets the release definitions after the continuation token provided.
     * @param queryOrder - Gets the results in the defined order. Default is 'IdAscending'.
     * @param path - Gets the release definitions under the specified path.
     * @param isExactNameMatch - 'true'to gets the release definitions with exact match as specified in searchText. Default is 'false'.
     * @param tagFilter - A comma-delimited list of tags. Only release definitions with these tags will be returned.
     * @param propertyFilters - A comma-delimited list of extended properties to be retrieved. If set, the returned Release Definitions will contain values for the specified property Ids (if they exist). If not set, properties will not be included. Note that this will not filter out any Release Definition from results irrespective of whether it has property set or not.
     * @param definitionIdFilter - A comma-delimited list of release definitions to retrieve.
     * @param isDeleted - 'true' to get release definitions that has been deleted. Default is 'false'
     * @param searchTextContainsFolderName - 'true' to get the release definitions under the folder with name as specified in searchText. Default is 'false'.
     */
    async getReleaseDefinitions(project, searchText, expand, artifactType, artifactSourceId, top, continuationToken, queryOrder, path, isExactNameMatch, tagFilter, propertyFilters, definitionIdFilter, isDeleted, searchTextContainsFolderName) {
      const queryValues = {
        searchText,
        "$expand": expand,
        artifactType,
        artifactSourceId,
        "$top": top,
        continuationToken,
        queryOrder,
        path,
        isExactNameMatch,
        tagFilter: tagFilter && tagFilter.join(","),
        propertyFilters: propertyFilters && propertyFilters.join(","),
        definitionIdFilter: definitionIdFilter && definitionIdFilter.join(","),
        isDeleted,
        searchTextContainsFolderName
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project
        },
        queryParams: queryValues,
        returnRawResponse: true
      }).then(async (response) => {
        const body = await response.text().then(deserializeVssJsonObject);
        body.continuationToken = response.headers.get("x-ms-continuationtoken");
        return body;
      });
    }
    /**
     * Undelete a release definition.
     *
     * @param releaseDefinitionUndeleteParameter - Object for undelete release definition.
     * @param project - Project ID or project name
     * @param definitionId - Id of the release definition to be undeleted
     */
    async undeleteReleaseDefinition(releaseDefinitionUndeleteParameter, project, definitionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project,
          definitionId
        },
        body: releaseDefinitionUndeleteParameter
      });
    }
    /**
     * Update a release definition.
     *
     * @param releaseDefinition - Release definition object to update.
     * @param project - Project ID or project name
     * @param skipTasksValidation - Skip task validation boolean flag
     */
    async updateReleaseDefinition(releaseDefinition, project, skipTasksValidation) {
      const queryValues = {
        skipTasksValidation
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "PUT",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}",
        routeValues: {
          project
        },
        queryParams: queryValues,
        body: releaseDefinition
      });
    }
    /**
     * Get a list of deployments
     *
     * @param project - Project ID or project name
     * @param definitionId - List the deployments for a given definition id.
     * @param definitionEnvironmentId - List the deployments for a given definition environment id.
     * @param createdBy - List the deployments for which deployments are created as identity specified.
     * @param minModifiedTime - List the deployments with LastModified time \>= minModifiedTime.
     * @param maxModifiedTime - List the deployments with LastModified time \<= maxModifiedTime.
     * @param deploymentStatus - List the deployments with given deployment status. Default is 'All'.
     * @param operationStatus - List the deployments with given operation status. Default is 'All'.
     * @param latestAttemptsOnly - 'true' to include deployments with latest attempt only. Default is 'false'.
     * @param queryOrder - List the deployments with given query order. Default is 'Descending'.
     * @param top - List the deployments with given top. Default top is '50' and Max top is '100'.
     * @param continuationToken - List the deployments with deployment id \>= continuationToken.
     * @param createdFor - List the deployments for which deployments are requested as identity specified.
     * @param minStartedTime - List the deployments with StartedOn time \>= minStartedTime.
     * @param maxStartedTime - List the deployments with StartedOn time \<= maxStartedTime.
     * @param sourceBranch - List the deployments that are deployed from given branch name.
     */
    async getDeployments(project, definitionId, definitionEnvironmentId, createdBy, minModifiedTime, maxModifiedTime, deploymentStatus, operationStatus, latestAttemptsOnly, queryOrder, top, continuationToken, createdFor, minStartedTime, maxStartedTime, sourceBranch) {
      const queryValues = {
        definitionId,
        definitionEnvironmentId,
        createdBy,
        minModifiedTime,
        maxModifiedTime,
        deploymentStatus,
        operationStatus,
        latestAttemptsOnly,
        queryOrder,
        "$top": top,
        continuationToken,
        createdFor,
        minStartedTime,
        maxStartedTime,
        sourceBranch
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/deployments",
        routeValues: {
          project
        },
        queryParams: queryValues,
        returnRawResponse: true
      }).then(async (response) => {
        const body = await response.text().then(deserializeVssJsonObject);
        body.continuationToken = response.headers.get("x-ms-continuationtoken");
        return body;
      });
    }
    /**
     * @param queryParameters -
     * @param project - Project ID or project name
     */
    async getDeploymentsForMultipleEnvironments(queryParameters, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/deployments",
        routeValues: {
          project
        },
        body: queryParameters
      });
    }
    /**
     * Get a release environment.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of the release environment.
     * @param expand - A property that should be expanded in the environment.
     */
    async getReleaseEnvironment(project, releaseId, environmentId, expand) {
      const queryValues = {
        "$expand": expand
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.8",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}",
        routeValues: {
          project,
          releaseId,
          environmentId
        },
        queryParams: queryValues
      });
    }
    /**
     * Update the status of a release environment
     *
     * @param environmentUpdateData - Environment update meta data.
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of release environment.
     */
    async updateReleaseEnvironment(environmentUpdateData, project, releaseId, environmentId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.8",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}",
        routeValues: {
          project,
          releaseId,
          environmentId
        },
        body: environmentUpdateData
      });
    }
    /**
     * Creates a definition environment template
     *
     * @param template - Definition environment template to create
     * @param project - Project ID or project name
     */
    async createDefinitionEnvironmentTemplate(template, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/definitions/environmenttemplates",
        routeValues: {
          project
        },
        body: template
      });
    }
    /**
     * Delete a definition environment template
     *
     * @param project - Project ID or project name
     * @param templateId - Id of the definition environment template
     */
    async deleteDefinitionEnvironmentTemplate(project, templateId) {
      const queryValues = {
        templateId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/definitions/environmenttemplates",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets a definition environment template
     *
     * @param project - Project ID or project name
     * @param templateId - Id of the definition environment template
     */
    async getDefinitionEnvironmentTemplate(project, templateId) {
      const queryValues = {
        templateId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        routeTemplate: "{project}/_apis/Release/definitions/environmenttemplates",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets a list of definition environment templates
     *
     * @param project - Project ID or project name
     * @param isDeleted - 'true' to get definition environment templates that have been deleted. Default is 'false'
     */
    async listDefinitionEnvironmentTemplates(project, isDeleted) {
      const queryValues = {
        isDeleted
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        routeTemplate: "{project}/_apis/Release/definitions/environmenttemplates",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Undelete a release definition environment template.
     *
     * @param project - Project ID or project name
     * @param templateId - Id of the definition environment template to be undeleted
     */
    async undeleteReleaseDefinitionEnvironmentTemplate(project, templateId) {
      const queryValues = {
        templateId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/definitions/environmenttemplates",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * @param favoriteItems -
     * @param project - Project ID or project name
     * @param scope -
     * @param identityId -
     */
    async createFavorites(favoriteItems, project, scope, identityId) {
      const queryValues = {
        identityId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/favorites/{scope}",
        routeValues: {
          project,
          scope
        },
        queryParams: queryValues,
        body: favoriteItems
      });
    }
    /**
     * @param project - Project ID or project name
     * @param scope -
     * @param identityId -
     * @param favoriteItemIds -
     */
    async deleteFavorites(project, scope, identityId, favoriteItemIds) {
      const queryValues = {
        identityId,
        favoriteItemIds
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/favorites/{scope}",
        routeValues: {
          project,
          scope
        },
        queryParams: queryValues
      });
    }
    /**
     * @param project - Project ID or project name
     * @param scope -
     * @param identityId -
     */
    async getFavorites(project, scope, identityId) {
      const queryValues = {
        identityId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/favorites/{scope}",
        routeValues: {
          project,
          scope
        },
        queryParams: queryValues
      });
    }
    /**
     * Creates a new folder.
     *
     * @param folder - folder.
     * @param project - Project ID or project name
     * @param path - Path of the folder.
     */
    async createFolder(folder, project, path) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/folders/{*path}",
        routeValues: {
          project,
          path
        },
        body: folder
      });
    }
    /**
     * Deletes a definition folder for given folder name and path and all it's existing definitions.
     *
     * @param project - Project ID or project name
     * @param path - Path of the folder to delete.
     */
    async deleteFolder(project, path) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/folders/{*path}",
        routeValues: {
          project,
          path
        }
      });
    }
    /**
     * Gets folders.
     *
     * @param project - Project ID or project name
     * @param path - Path of the folder.
     * @param queryOrder - Gets the results in the defined order. Default is 'None'.
     */
    async getFolders(project, path, queryOrder) {
      const queryValues = {
        queryOrder
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/folders/{*path}",
        routeValues: {
          project,
          path
        },
        queryParams: queryValues
      });
    }
    /**
     * Updates an existing folder at given existing path.
     *
     * @param folder - folder.
     * @param project - Project ID or project name
     * @param path - Path of the folder to update.
     */
    async updateFolder(folder, project, path) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/folders/{*path}",
        routeValues: {
          project,
          path
        },
        body: folder
      });
    }
    /**
     * Updates the gate for a deployment.
     *
     * @param gateUpdateMetadata - Metadata to patch the Release Gates.
     * @param project - Project ID or project name
     * @param gateStepId - Gate step Id.
     */
    async updateGates(gateUpdateMetadata, project, gateStepId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/gates/{gateStepId}",
        routeValues: {
          project,
          gateStepId
        },
        body: gateUpdateMetadata
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     */
    async getReleaseHistory(project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/history",
        routeValues: {
          project,
          releaseId
        }
      });
    }
    /**
     * @param query -
     * @param project - Project ID or project name
     */
    async getInputValues(query, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/artifacts/inputvaluesquery",
        routeValues: {
          project
        },
        body: query
      });
    }
    /**
     * @param project - Project ID or project name
     * @param buildId -
     * @param sourceId -
     */
    async getIssues(project, buildId, sourceId) {
      const queryValues = {
        sourceId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/issues/{buildId}",
        routeValues: {
          project,
          buildId
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets gate logs
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of release environment.
     * @param gateId - Id of the gate.
     * @param taskId - ReleaseTask Id for the log.
     */
    async getGateLog(project, releaseId, environmentId, gateId, taskId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/gates/{gateId}/tasks/{taskId}/logs",
        routeValues: {
          project,
          releaseId,
          environmentId,
          gateId,
          taskId
        }
      });
    }
    /**
     * Get logs for a release Id.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     */
    async getLogs(project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        httpResponseType: "application/zip",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/logs",
        routeValues: {
          project,
          releaseId
        }
      });
    }
    /**
     * Gets logs
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of release environment.
     * @param taskId - ReleaseTask Id for the log.
     * @param attemptId - Id of the attempt.
     */
    async getLog(project, releaseId, environmentId, taskId, attemptId) {
      const queryValues = {
        attemptId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/tasks/{taskId}/logs",
        routeValues: {
          project,
          releaseId,
          environmentId,
          taskId
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets the task log of a release as a plain text file.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of release environment.
     * @param attemptId -
     * @param timelineId -
     * @param taskId - ReleaseTask Id for the log.
     * @param startLine - Starting line number for logs
     * @param endLine - Ending line number for logs
     */
    async getTaskLog2(project, releaseId, environmentId, attemptId, timelineId, taskId, startLine, endLine) {
      const queryValues = {
        startLine,
        endLine
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/attempts/{attemptId}/timelines/{timelineId}/tasks/{taskId}/logs",
        routeValues: {
          project,
          releaseId,
          environmentId,
          attemptId,
          timelineId,
          taskId
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets the task log of a release as a plain text file.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param environmentId - Id of release environment.
     * @param releaseDeployPhaseId - Release deploy phase Id.
     * @param taskId - ReleaseTask Id for the log.
     * @param startLine - Starting line number for logs
     * @param endLine - Ending line number for logs
     */
    async getTaskLog(project, releaseId, environmentId, releaseDeployPhaseId, taskId, startLine, endLine) {
      const queryValues = {
        startLine,
        endLine
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/deployPhases/{releaseDeployPhaseId}/tasks/{taskId}/logs",
        routeValues: {
          project,
          releaseId,
          environmentId,
          releaseDeployPhaseId,
          taskId
        },
        queryParams: queryValues
      });
    }
    /**
     * Get manual intervention for a given release and manual intervention id.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param manualInterventionId - Id of the manual intervention.
     */
    async getManualIntervention(project, releaseId, manualInterventionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/manualInterventions/{manualInterventionId}",
        routeValues: {
          project,
          releaseId,
          manualInterventionId
        }
      });
    }
    /**
     * List all manual interventions for a given release.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     */
    async getManualInterventions(project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/manualInterventions/{manualInterventionId}",
        routeValues: {
          project,
          releaseId
        }
      });
    }
    /**
     * Update manual intervention.
     *
     * @param manualInterventionUpdateMetadata - Meta data to update manual intervention.
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param manualInterventionId - Id of the manual intervention.
     */
    async updateManualIntervention(manualInterventionUpdateMetadata, project, releaseId, manualInterventionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/manualInterventions/{manualInterventionId}",
        routeValues: {
          project,
          releaseId,
          manualInterventionId
        },
        body: manualInterventionUpdateMetadata
      });
    }
    /**
     * @param project - Project ID or project name
     * @param minMetricsTime -
     */
    async getMetrics(project, minMetricsTime) {
      const queryValues = {
        minMetricsTime
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/metrics",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Gets Org pipeline release settings
     *
     */
    async getOrgPipelineReleaseSettings() {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "_apis/Release/orgPipelineReleaseSettings"
      });
    }
    /**
     * Updates Org pipeline release settings
     *
     * @param newSettings -
     */
    async updateOrgPipelineReleaseSettings(newSettings) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "PATCH",
        routeTemplate: "_apis/Release/orgPipelineReleaseSettings",
        body: newSettings
      });
    }
    /**
     * Gets pipeline release settings
     *
     * @param project - Project ID or project name
     */
    async getPipelineReleaseSettings(project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/pipelineReleaseSettings",
        routeValues: {
          project
        }
      });
    }
    /**
     * Updates pipeline release settings
     *
     * @param newSettings -
     * @param project - Project ID or project name
     */
    async updatePipelineReleaseSettings(newSettings, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/pipelineReleaseSettings",
        routeValues: {
          project
        },
        body: newSettings
      });
    }
    /**
     * @param artifactType -
     * @param artifactSourceId -
     */
    async getReleaseProjects(artifactType, artifactSourceId) {
      const queryValues = {
        artifactType,
        artifactSourceId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "_apis/Release/projects",
        queryParams: queryValues
      });
    }
    /**
     * Get a list of releases
     *
     * @param project - Project ID or project name
     * @param definitionId - Releases from this release definition Id.
     * @param definitionEnvironmentId - Id of the definition environment. Required when using environmentStatusFilter.
     * @param searchText - Releases with names containing searchText.
     * @param createdBy - Releases created by this user.
     * @param statusFilter - Releases that have this status.
     * @param environmentStatusFilter - Filters releases by environment status. Must be used with definitionEnvironmentId. Values: Undefined (0), NotStarted (1), InProgress (2), Succeeded (4), Canceled (8), Rejected (16), Queued (32), Scheduled (64), PartiallySucceeded (128). These are [Flags] values and can be combined (e.g. 4|16 = 20 for Succeeded or Rejected). Cannot be used with sourceBranchFilter.
     * @param minCreatedTime - Releases that were created after this time.
     * @param maxCreatedTime - Releases that were created before this time.
     * @param queryOrder - Gets the results in the defined order of created date for releases. Default is descending.
     * @param top - Number of releases to get. Default is 50.
     * @param continuationToken - Gets the releases after the continuation token provided.
     * @param expand - The property that should be expanded in the list of releases.
     * @param artifactTypeId - Releases with given artifactTypeId will be returned. Values can be Build, Jenkins, GitHub, Nuget, Team Build (external), ExternalTFSBuild, Git, TFVC, ExternalTfsXamlBuild.
     * @param sourceId - Unique identifier of the artifact used. e.g. For build it would be \{projectGuid\}:\{BuildDefinitionId\}, for Jenkins it would be \{JenkinsConnectionId\}:\{JenkinsDefinitionId\}, for TfsOnPrem it would be \{TfsOnPremConnectionId\}:\{ProjectName\}:\{TfsOnPremDefinitionId\}. For third-party artifacts e.g. TeamCity, BitBucket you may refer 'uniqueSourceIdentifier' inside vss-extension.json https://github.com/Microsoft/vsts-rm-extensions/blob/master/Extensions.
     * @param artifactVersionId - Releases with given artifactVersionId will be returned. E.g. in case of Build artifactType, it is buildId.
     * @param sourceBranchFilter - Releases with given sourceBranchFilter will be returned (Not to be used with environmentStatusFilter).
     * @param isDeleted - Gets the soft deleted releases, if true.
     * @param tagFilter - A comma-delimited list of tags. Only releases with these tags will be returned.
     * @param propertyFilters - A comma-delimited list of extended properties to be retrieved. If set, the returned Releases will contain values for the specified property Ids (if they exist). If not set, properties will not be included. Note that this will not filter out any Release from results irrespective of whether it has property set or not.
     * @param releaseIdFilter - A comma-delimited list of releases Ids. Only releases with these Ids will be returned.
     * @param path - Releases under this folder path will be returned
     */
    async getReleases(project, definitionId, definitionEnvironmentId, searchText, createdBy, statusFilter, environmentStatusFilter, minCreatedTime, maxCreatedTime, queryOrder, top, continuationToken, expand, artifactTypeId, sourceId, artifactVersionId, sourceBranchFilter, isDeleted, tagFilter, propertyFilters, releaseIdFilter, path) {
      const queryValues = {
        definitionId,
        definitionEnvironmentId,
        searchText,
        createdBy,
        statusFilter,
        environmentStatusFilter,
        minCreatedTime,
        maxCreatedTime,
        queryOrder,
        "$top": top,
        continuationToken,
        "$expand": expand,
        artifactTypeId,
        sourceId,
        artifactVersionId,
        sourceBranchFilter,
        isDeleted,
        tagFilter: tagFilter && tagFilter.join(","),
        propertyFilters: propertyFilters && propertyFilters.join(","),
        releaseIdFilter: releaseIdFilter && releaseIdFilter.join(","),
        path
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        routeTemplate: "{project}/_apis/Release/releases",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Create a release.
     *
     * @param releaseStartMetadata - Metadata to create a release.
     * @param project - Project ID or project name
     */
    async createRelease(releaseStartMetadata, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project
        },
        body: releaseStartMetadata
      });
    }
    /**
     * Soft delete a release
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param comment - Comment for deleting a release.
     */
    async deleteRelease(project, releaseId, comment) {
      const queryValues = {
        comment
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        queryParams: queryValues
      });
    }
    /**
     * Get a Release
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param approvalFilters - A filter which would allow fetching approval steps selectively based on whether it is automated, or manual. This would also decide whether we should fetch pre and post approval snapshots. Assumes All by default
     * @param propertyFilters - A comma-delimited list of extended properties to be retrieved. If set, the returned Release will contain values for the specified property Ids (if they exist). If not set, properties will not be included.
     * @param expand - A property that should be expanded in the release.
     * @param topGateRecords - Number of release gate records to get. Default is 5.
     * @param includeDisabledDefinitions - Include disabled definitions (if set to 'false' returns error, default is 'true')
     */
    async getRelease(project, releaseId, approvalFilters, propertyFilters, expand, topGateRecords, includeDisabledDefinitions) {
      const queryValues = {
        approvalFilters,
        propertyFilters: propertyFilters && propertyFilters.join(","),
        "$expand": expand,
        "$topGateRecords": topGateRecords,
        includeDisabledDefinitions
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        queryParams: queryValues
      });
    }
    /**
     * Get release summary of a given definition Id.
     *
     * @param project - Project ID or project name
     * @param definitionId - Id of the definition to get release summary.
     * @param releaseCount - Count of releases to be included in summary.
     * @param includeArtifact - Include artifact details.Default is 'false'.
     * @param definitionEnvironmentIdsFilter -
     */
    async getReleaseDefinitionSummary(project, definitionId, releaseCount, includeArtifact, definitionEnvironmentIdsFilter) {
      const queryValues = {
        definitionId,
        releaseCount,
        includeArtifact,
        definitionEnvironmentIdsFilter: definitionEnvironmentIdsFilter && definitionEnvironmentIdsFilter.join(",")
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * Get release for a given revision number.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of the release.
     * @param definitionSnapshotRevision - Definition snapshot revision number.
     */
    async getReleaseRevision(project, releaseId, definitionSnapshotRevision) {
      const queryValues = {
        definitionSnapshotRevision
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        queryParams: queryValues
      });
    }
    /**
     * Undelete a soft deleted release.
     *
     * @param project - Project ID or project name
     * @param releaseId - Id of release to be undeleted.
     * @param comment - Any comment for undeleting.
     */
    async undeleteRelease(project, releaseId, comment) {
      const queryValues = {
        comment
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        method: "PUT",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        queryParams: queryValues
      });
    }
    /**
     * Update a complete release object.
     *
     * @param release - Release object for update.
     * @param project - Project ID or project name
     * @param releaseId - Id of the release to update.
     */
    async updateRelease(release, project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        method: "PUT",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        body: release
      });
    }
    /**
     * Update few properties of a release.
     *
     * @param releaseUpdateMetadata - Properties of release to update.
     * @param project - Project ID or project name
     * @param releaseId - Id of the release to update.
     */
    async updateReleaseResource(releaseUpdateMetadata, project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.9",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        body: releaseUpdateMetadata
      });
    }
    /**
     * Gets the release settings
     *
     * @param project - Project ID or project name
     */
    async getReleaseSettings(project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releasesettings",
        routeValues: {
          project
        }
      });
    }
    /**
     * Updates the release settings
     *
     * @param releaseSettings -
     * @param project - Project ID or project name
     */
    async updateReleaseSettings(releaseSettings, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "PUT",
        routeTemplate: "{project}/_apis/Release/releasesettings",
        routeValues: {
          project
        },
        body: releaseSettings
      });
    }
    /**
     * Get release definition for a given definitionId and revision
     *
     * @param project - Project ID or project name
     * @param definitionId - Id of the definition.
     * @param revision - Id of the revision.
     */
    async getDefinitionRevision(project, definitionId, revision) {
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        httpResponseType: "text/plain",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}/revisions/{revision}",
        routeValues: {
          project,
          definitionId,
          revision
        }
      });
    }
    /**
     * Get revision history for a release definition
     *
     * @param project - Project ID or project name
     * @param definitionId - Id of the definition.
     */
    async getReleaseDefinitionHistory(project, definitionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.4",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}/revisions/{revision}",
        routeValues: {
          project,
          definitionId
        }
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     */
    async getSummaryMailSections(project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/sendmail/{releaseId}",
        routeValues: {
          project,
          releaseId
        }
      });
    }
    /**
     * @param mailMessage -
     * @param project - Project ID or project name
     * @param releaseId -
     */
    async sendSummaryMail(mailMessage, project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/sendmail/{releaseId}",
        routeValues: {
          project,
          releaseId
        },
        body: mailMessage
      });
    }
    /**
     * @param project - Project ID or project name
     * @param definitionId -
     */
    async getSourceBranches(project, definitionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/definitions/{definitionId}/sourcebranches",
        routeValues: {
          project,
          definitionId
        }
      });
    }
    /**
     * Adds a tag to a definition
     *
     * @param project - Project ID or project name
     * @param releaseDefinitionId -
     * @param tag -
     */
    async addDefinitionTag(project, releaseDefinitionId, tag) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/definitions/{releaseDefinitionId}/tags/{*tag}",
        routeValues: {
          project,
          releaseDefinitionId,
          tag
        }
      });
    }
    /**
     * Adds multiple tags to a definition
     *
     * @param tags -
     * @param project - Project ID or project name
     * @param releaseDefinitionId -
     */
    async addDefinitionTags(tags, project, releaseDefinitionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/definitions/{releaseDefinitionId}/tags/{*tag}",
        routeValues: {
          project,
          releaseDefinitionId
        },
        body: tags
      });
    }
    /**
     * Deletes a tag from a definition
     *
     * @param project - Project ID or project name
     * @param releaseDefinitionId -
     * @param tag -
     */
    async deleteDefinitionTag(project, releaseDefinitionId, tag) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/definitions/{releaseDefinitionId}/tags/{*tag}",
        routeValues: {
          project,
          releaseDefinitionId,
          tag
        }
      });
    }
    /**
     * Gets the tags for a definition
     *
     * @param project - Project ID or project name
     * @param releaseDefinitionId -
     */
    async getDefinitionTags(project, releaseDefinitionId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/definitions/{releaseDefinitionId}/tags/{*tag}",
        routeValues: {
          project,
          releaseDefinitionId
        }
      });
    }
    /**
     * Adds a tag to a releaseId
     *
     * @param project - Project ID or project name
     * @param releaseId -
     * @param tag -
     */
    async addReleaseTag(project, releaseId, tag) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "PATCH",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/tags/{*tag}",
        routeValues: {
          project,
          releaseId,
          tag
        }
      });
    }
    /**
     * Adds tag to a release
     *
     * @param tags -
     * @param project - Project ID or project name
     * @param releaseId -
     */
    async addReleaseTags(tags, project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/tags/{*tag}",
        routeValues: {
          project,
          releaseId
        },
        body: tags
      });
    }
    /**
     * Deletes a tag from a release
     *
     * @param project - Project ID or project name
     * @param releaseId -
     * @param tag -
     */
    async deleteReleaseTag(project, releaseId, tag) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "DELETE",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/tags/{*tag}",
        routeValues: {
          project,
          releaseId,
          tag
        }
      });
    }
    /**
     * Gets the tags for a release
     *
     * @param project - Project ID or project name
     * @param releaseId -
     */
    async getReleaseTags(project, releaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/tags/{*tag}",
        routeValues: {
          project,
          releaseId
        }
      });
    }
    /**
     * @param project - Project ID or project name
     */
    async getTags(project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/tags",
        routeValues: {
          project
        }
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     * @param environmentId -
     * @param releaseDeployPhaseId -
     */
    async getTasksForTaskGroup(project, releaseId, environmentId, releaseDeployPhaseId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/deployPhases/{releaseDeployPhaseId}/tasks",
        routeValues: {
          project,
          releaseId,
          environmentId,
          releaseDeployPhaseId
        }
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     * @param environmentId -
     * @param attemptId -
     * @param timelineId -
     */
    async getTasks2(project, releaseId, environmentId, attemptId, timelineId) {
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/attempts/{attemptId}/timelines/{timelineId}/tasks",
        routeValues: {
          project,
          releaseId,
          environmentId,
          attemptId,
          timelineId
        }
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     * @param environmentId -
     * @param attemptId -
     */
    async getTasks(project, releaseId, environmentId, attemptId) {
      const queryValues = {
        attemptId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.2",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/environments/{environmentId}/tasks",
        routeValues: {
          project,
          releaseId,
          environmentId
        },
        queryParams: queryValues
      });
    }
    /**
     * @param project - Project ID or project name
     */
    async getArtifactTypeDefinitions(project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/artifacts/types",
        routeValues: {
          project
        }
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseDefinitionId -
     */
    async getArtifactVersions(project, releaseDefinitionId) {
      const queryValues = {
        releaseDefinitionId
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/artifacts/versions",
        routeValues: {
          project
        },
        queryParams: queryValues
      });
    }
    /**
     * @param artifacts -
     * @param project - Project ID or project name
     */
    async getArtifactVersionsForSources(artifacts, project) {
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        method: "POST",
        routeTemplate: "{project}/_apis/Release/artifacts/versions",
        routeValues: {
          project
        },
        body: artifacts
      });
    }
    /**
     * @param project - Project ID or project name
     * @param releaseId -
     * @param baseReleaseId -
     * @param top -
     * @param artifactAlias -
     */
    async getReleaseWorkItemsRefs(project, releaseId, baseReleaseId, top, artifactAlias) {
      const queryValues = {
        baseReleaseId,
        "$top": top,
        artifactAlias
      };
      return this.beginRequest({
        apiVersion: "7.2-preview.1",
        routeTemplate: "{project}/_apis/Release/releases/{releaseId}/workitems",
        routeValues: {
          project,
          releaseId
        },
        queryParams: queryValues
      });
    }
  };
  ReleaseRestClient.RESOURCE_AREA_ID = "efc2f575-36ef-48e9-b672-0c6fb4a48ac5";

  // report-extension/src/tab.js
  var TASK_ID = "afa798a9-bb1a-4594-8387-04c9c8f4ed27";
  var ATTACHMENT = "perf-html-report";
  function show(text) {
    document.body.innerHTML = "<p>" + text + "</p>";
  }
  function decode2(content) {
    if (typeof content === "string") return content;
    if (content instanceof ArrayBuffer) return new TextDecoder("utf-8").decode(content);
    if (content && content.buffer) return new TextDecoder("utf-8").decode(new Uint8Array(content.buffer));
    return "";
  }
  function attempts(environment) {
    const numbers = [];
    (environment.deploySteps || []).forEach(function(step, index) {
      const value = Number(step.attempt || index + 1);
      if (value > 0 && value < 1e3 && numbers.indexOf(value) === -1) numbers.push(value);
    });
    if (!numbers.length) numbers.push(1);
    return numbers;
  }
  function planIds(environment) {
    const ids = [];
    (environment.deploySteps || []).forEach(function(step) {
      (step.releaseDeployPhases || []).forEach(function(phase) {
        if (phase.runPlanId && ids.indexOf(phase.runPlanId) === -1) ids.push(phase.runPlanId);
      });
    });
    return ids;
  }
  function render(items) {
    const report = items[items.length - 1];
    document.body.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "");
    frame.srcdoc = report.content;
    document.body.appendChild(frame);
  }
  async function loadReports(environment, projectId) {
    const client = getClient(ReleaseRestClient);
    const seen = {};
    const items = [];
    for (const attempt of attempts(environment)) {
      for (const planId of planIds(environment)) {
        const attachments = await client.getReleaseTaskAttachments(
          projectId,
          environment.releaseId,
          environment.id,
          attempt,
          planId,
          ATTACHMENT
        );
        for (const attachment of attachments || []) {
          const key = attachment.timelineId + attachment.recordId + attachment.name;
          if (seen[key]) continue;
          seen[key] = true;
          const content = await client.getReleaseTaskAttachmentContent(
            projectId,
            environment.releaseId,
            environment.id,
            attempt,
            planId,
            attachment.timelineId,
            attachment.recordId,
            ATTACHMENT,
            attachment.name
          );
          const html = decode2(content);
          if (html.toLowerCase().indexOf("<html") === -1) continue;
          items.push({
            friendlyName: String(attachment.name || "Report").replace(/\.html$/i, ""),
            content: html
          });
        }
      }
    }
    return items;
  }
  async function load() {
    const configuration = await Promise.resolve(C() || {});
    const environment = configuration.releaseEnvironment;
    if (!environment) {
      show("Abre Reports desde la etapa de la release, junto a Logs.");
      return;
    }
    const projectService = await F("ms.vss-tfs-web.tfs-page-data-service");
    const project = await projectService.getProject();
    if (!project) {
      show("No se pudo identificar el proyecto.");
      return;
    }
    const items = await loadReports(environment, project.id);
    if (!items.length) {
      show("Esta etapa no tiene un reporte HTML. Agrega Publish HTML Report y despliega de nuevo.");
      return;
    }
    render(items);
  }
  L("registeredEnvironmentObject", function() {
    return {
      isInvisible: function(tabContext) {
        const phases = tabContext && tabContext.releaseEnvironment && tabContext.releaseEnvironment.deployPhasesSnapshot;
        if (!phases || !phases.length) return false;
        const ids = [];
        phases.forEach(function(phase) {
          (phase.workflowTasks || []).forEach(function(task) {
            const id = task && (task.taskId || task.id);
            if (id) ids.push(String(id).toLowerCase());
          });
        });
        if (!ids.length) return false;
        return ids.indexOf(TASK_ID) < 0;
      }
    };
  });
  j({ loaded: false, applyTheme: true });
  R().then(function() {
    I();
    return load();
  }).catch(function(error) {
    show("No se pudo leer el reporte. " + (error && error.message ? error.message : error));
    I();
  });
})();
