import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const secret=new gcp.secretmanager.Secret("secret",{
    secretId: "secret-1",
    replication: {
        auto: {},
    },
});
const secret_version_data=new gcp.secretmanager.SecretVersion("secret-version-data",{
    secret: secret.name,
    secretData: "secret-data",
});
const instance=new gcp.sql.DatabaseInstance("instance",{
    name: "cloudrun-sql",
    region: "us-central1",
    databaseVersion: "MYSQL_8_4",
    settings: {
        tier: "db-f1-micro",
    },
    deletionProtection: true,
});
const _default=new gcp.cloudrunv2.Service("default",{
    name: "cloudrun-service",
    location: "us-central1",
    deletionProtection: false,
    ingress: "INGRESS_TRAFFIC_ALL",
    scaling: {
        maxInstanceCount: 2,
    },
    template: {
        volumes: [{
            name: "cloudsql",
            cloudSqlInstance: {
                instances: [instance.connectionName],
            },
        }],
        containers: [{
            image: "us-docker.pkg.dev/cloudrun/container/hello",
            envs: [
                {
                    name: "FOO",
                    value: "bar",
                },
                {
                    name: "SECRET_ENV_VAR",
                    valueSource: {
                        secretKeyRef: {
                            secret: secret.secretId,
                            version: "1",
                        },
                    },
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
    dependsOn: [secret_version_data],
});
const project=gcp.organizations.getProject({});
const secret_access=new gcp.secretmanager.SecretIamMember("secret-access",{
    secretId: secret.id,
    role: "roles/secretmanager.secretAccessor",
    member: project.then(project => `serviceAccount:${project.number}-compute@developer.gserviceaccount.com`),
},{
    dependsOn: [secret],
});