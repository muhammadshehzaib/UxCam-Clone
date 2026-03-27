plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")
}

android {
    namespace  = "app.uxclone.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 21
        targetSdk = 34
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
}

publishing {
    publications {
        register<MavenPublication>("release") {
            groupId    = "app.uxclone"
            artifactId = "sdk"
            version    = "0.1.0"
            afterEvaluate { from(components["release"]) }
        }
    }
}
