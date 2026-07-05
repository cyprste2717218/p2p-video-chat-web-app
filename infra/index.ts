import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const config=new pulumi.Config();

// Sensitive values — store with: pulumi config set --secret <key> <value>
const dbPassword=config.requireSecret("dbPassword");
const jwtSecret=config.requireSecret("jwtSecret");
const refreshTokenSecret=config.requireSecret("refreshTokenSecret");

// Secret Manager secrets
const dbPasswordSecret=new gcp.secretmanager.Secret("db-password-secret",{
    secretId: "db-password",
    replication: {auto: {}},
});
const dbPasswordSecretVersion=new gcp.secretmanager.SecretVersion("db-password-version",{
    secret: dbPasswordSecret.name,
    secretData: dbPassword,
});

const jwtSecret_=new gcp.secretmanager.Secret("jwt-secret",{
    secretId: "jwt-secret",
    replication: {auto: {}},
});
const jwtSecretVersion=new gcp.secretmanager.SecretVersion("jwt-secret-version",{
    secret: jwtSecret_.name,
    secretData: jwtSecret,
});

const refreshTokenSecret_=new gcp.secretmanager.Secret("refresh-token-secret",{
    secretId: "refresh-token-secret",
    replication: {auto: {}},
});
const refreshTokenSecretVersion=new gcp.secretmanager.SecretVersion("refresh-token-secret-version",{
    secret: refreshTokenSecret_.name,
    secretData: refreshTokenSecret,
});


// Voneo Frontend - Google Cloud V2 Run Service

const frontendImageTag=config.get("frontendImageTag")??"latest";

const voneoFrontend=new gcp.cloudrunv2.Service("default",{
    name: "voneo-frontend",
    location: "europe-west2",
    deletionProtection: false,
    ingress: "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER",
    scaling: {
        maxInstanceCount: 2,
    },
    template: {
        containers: [{
            image: `europe-west2-docker.pkg.dev/signalling-api/voneo/voneo-frontend:${frontendImageTag}`,
        }],
    },
    traffics: [{
        type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
        percent: 100,
    }],
});

// Voneo Backend - Google Cloud V2 Run Service

const dbInstance=new gcp.sql.DatabaseInstance("instance",{
    name: "voneo-db",
    region: "europe-west2",
    databaseVersion: "MYSQL_8_4",
    settings: {
        tier: "db-f1-micro",
    },
    deletionProtection: true,
});

// MySQL user with password from Pulumi encrypted config
const dbUser=new gcp.sql.User("db-user",{
    instance: dbInstance.name,
    name: "voneo",
    password: dbPassword,
});

const project=gcp.organizations.getProject({});

// Grant Cloud Run's default compute SA access to all three secrets
const secretIds=[
    {name: "db-password-secret-access",secret: dbPasswordSecret},
    {name: "jwt-secret-access",secret: jwtSecret_},
    {name: "refresh-token-secret-access",secret: refreshTokenSecret_},
];
for (const {name,secret} of secretIds) {
    new gcp.secretmanager.SecretIamMember(name,{
        secretId: secret.id,
        role: "roles/secretmanager.secretAccessor",
        member: project.then(p => `serviceAccount:${p.number}-compute@developer.gserviceaccount.com`),
    },{dependsOn: [secret]});
}

const backendImageTag=config.get("backendImageTag")??"latest";

const voneoBackend=new gcp.cloudrunv2.Service("default",{
    name: "voneo-backend",
    location: "europe-west2",
    deletionProtection: false,
    ingress: "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER",
    scaling: {
        maxInstanceCount: 2,
    },
    template: {
        volumes: [{
            name: "cloudsql",
            cloudSqlInstance: {
                instances: [dbInstance.connectionName],
            },
        }],
        containers: [{
            image: `europe-west2-docker.pkg.dev/signalling-api/voneo/voneo-backend:${backendImageTag}`,
            envs: [
                {name: "NODE_ENV",value: "production"},
                {name: "DB_NAME",value: "voneo-db"},
                {name: "DB_HOST",value: pulumi.interpolate`/cloudsql/${dbInstance.connectionName}`},
                {name: "DB_PORT",value: "3306"},
                {
                    name: "DB_PASSWORD",
                    valueSource: {secretKeyRef: {secret: dbPasswordSecret.secretId,version: "latest"}},
                },
                {
                    name: "JWT_SECRET",
                    valueSource: {secretKeyRef: {secret: jwtSecret_.secretId,version: "latest"}},
                },
                {
                    name: "REFRESH_TOKEN_SECRET",
                    valueSource: {secretKeyRef: {secret: refreshTokenSecret_.secretId,version: "latest"}},
                },
            ],
            volumeMounts: [{
                name: "cloudsql",
                mountPath: "/cloudsql",
            }],
        }],
    },
    traffics: [{
        type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
        percent: 100,
    }],
},{
    dependsOn: [dbPasswordSecretVersion,jwtSecretVersion,refreshTokenSecretVersion],
});



// Global External ALB //

// IP for Global External ALB
const ip=new gcp.compute.GlobalAddress("lb-ip",{});

// NEG for the backend Cloud Run service
const backendNeg=new gcp.compute.RegionNetworkEndpointGroup("backend-neg",{
    region: "europe-west2",
    networkEndpointType: "SERVERLESS",
    cloudRun: {service: voneoBackend.name},
});

// NEG for the frontend Cloud Run service
const frontendNeg=new gcp.compute.RegionNetworkEndpointGroup("frontend-neg",{
    region: "europe-west2",
    networkEndpointType: "SERVERLESS",
    cloudRun: {service: voneoFrontend.name},
});

const backendService=new gcp.compute.BackendService("lb-backend",{
    protocol: "HTTP",
    loadBalancingScheme: "EXTERNAL_MANAGED",
    timeoutSec: 3600,
    backends: [{group: backendNeg.id}],
});

const frontendService=new gcp.compute.BackendService("lb-frontend",{
    protocol: "HTTP",
    loadBalancingScheme: "EXTERNAL_MANAGED",
    timeoutSec: 30,
    backends: [{group: frontendNeg.id}],
});

// Path-based routing: API + call routes → backend, everything else → frontend
// The web worker uses relative paths (e.g. fetch('/login'), fetch('/call/create'))
// so the backend Cloud Run URL is never exposed to the client.
const urlMap=new gcp.compute.URLMap("lb-url-map",{
    defaultService: frontendService.id,
    hostRules: [{
        hosts: ["yourdomain.com"],
        pathMatcher: "voneo-paths",
    }],
    pathMatchers: [{
        name: "voneo-paths",
        defaultService: frontendService.id,
        pathRules: [
            // Auth routes
            {paths: ["/signup","/login","/logout","/refresh"],service: backendService.id},
            // Call routes
            {paths: ["/call","/call/*"],service: backendService.id},
        ],
    }],
});

// SSL certificate for https proxy
const cert=new gcp.compute.ManagedSslCertificate("lb-cert",{
    managed: {domains: ["yourdomain.com"]},
});

const httpsProxy=new gcp.compute.TargetHttpsProxy("lb-https-proxy",{
    urlMap: urlMap.id,
    sslCertificates: [cert.id],
});

// The Global Forwarding Rule (app entry point) maps the IP address to the HTTPS proxy
const forwardingRule=new gcp.compute.GlobalForwardingRule("lb-forwarding-rule",{
    target: httpsProxy.id,
    portRange: "443",
    loadBalancingScheme: "EXTERNAL_MANAGED",
    ipAddress: ip.address,
});

export const lbIp=ip.address;

