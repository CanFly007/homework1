class DirectionalLight {

    constructor(lightIntensity, lightColor, lightPos, focalPoint, lightUp, hasShadowMap, gl) {
        this.mesh = Mesh.cube(setTransform(0, 0, 0, 0.2, 0.2, 0.2, 0));
        this.mat = new EmissiveMaterial(lightIntensity, lightColor);
        this.lightPos = lightPos;
        this.focalPoint = focalPoint;
        this.lightUp = lightUp

        this.hasShadowMap = hasShadowMap;
        this.fbo = new FBO(gl);
        if (!this.fbo) {
            console.log("无法设置帧缓冲区对象");
            return;
        }
    }

    CalcLightMVP(translate, scale) {
        let lightMVP = mat4.create();
        let modelMatrix = mat4.create();
        let viewMatrix = mat4.create();
        let projectionMatrix = mat4.create();

        // Model transform
         mat4.translate(modelMatrix, modelMatrix, translate);
         mat4.scale(modelMatrix, modelMatrix, scale);
        // View transform
        //this.lightPos = (0,80,80) this.focalPoint=[0,0,0] this.lightUp=[0,1,0]
        viewMatrix  = this.GetViewMat();
        //mat4.lookAt(viewMatrix,this.lightPos,this.focalPoint,this.lightUp);
             
        // Projection transform
        var size = 100; // half of height
        var aspect = 1.778;
        var near = 0.1;
        var far = 200;
        projectionMatrix = this.GetPerspectiveMat(size,aspect,near,far);
        //mat4.ortho(projectionMatrix,-100,100,-100,100,0.01,400);

        mat4.multiply(lightMVP, projectionMatrix, viewMatrix);
        mat4.multiply(lightMVP, lightMVP, modelMatrix);

        return lightMVP;
    }

    //0 4 8  12
    //1 5 9  13
    //2 6 10 14
    //3 7 11 15
    GetPerspectiveMat(size,aspect,near,far)
    {
        let result = mat4.create();
        var height = size * 2;
        var width = height * aspect;
        //按列排
        result[0] = 2 / width;
        result[5] = 2 / height;
        result[10] = 2 / (near - far);
        result[14] = (near + far) / (near - far);
        return result;
    }

    GetViewMat()
    {
        var rotationMat = mat4.create();
        var zDir = this.DirMinusDir(this.lightPos,this.focalPoint);
        zDir = this.DirNormalize(zDir);
        var xDir = this.DirCrossDir(this.lightUp,zDir);
        var yDir = this.DirCrossDir(zDir,xDir);
        //camera坐标在世界表示，按列排好，就是view到world。。 world到view所以按行排  
        //mat4 按列排
        // mat4.set(rotationMat, 
        //     xDir[0], xDir[1], xDir[2], 0,
        //     yDir[0], yDir[1], yDir[2], 0,
        //     zDir[0], zDir[1], zDir[2], 0,
        //     this.lightPos[0], this.lightPos[1], this.lightPos[2], 1);
        //3x3旋转可以,因为正交矩阵的逆矩阵就是其转置矩阵。平移[0，80，80]需要乘以另外的平移矩阵，lightpos的反方向
        mat4.set(rotationMat, 
            xDir[0], yDir[0], zDir[0], 0,
            xDir[1], yDir[1], zDir[1], 0,
            xDir[2], yDir[2], zDir[2], 0,
            0      , 0      , 0      , 1);
        
        let translation = mat4.create();
        //mat4.set按列排，每一列
        mat4.set(translation,
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            -this.lightPos[0],-this.lightPos[1],-this.lightPos[2],1);

        let result = mat4.create();
        //想一想，世界空间的一个物体，先按照世界坐标描述的反方向离开摄像机，才是对的。然后按照正交矩阵逆变换旋转到摄像机空间，所以是先平移，再旋转。
        mat4.multiply(result, rotationMat, translation);//顺序是rotation * translation才能得到，先平移，再旋转
        return result;
    }

    //0 4 8  12      * 0 4 8  12 
    //1 5 9  13      * 1 5 9  13
    //2 6 10 14      * 2 6 10 14 
    //3 7 11 15      * 3 7 11 15
    MatrixMulMatrix(mata,matb)
    {
        var result = mat4.create();
        mat4.set(result,
                mata[0] * matb[0] + mata[4] * matb[1] + mata[8] * matb[2] + mata[12] * matb[3],
                mata[1] * matb[0] + mata[5] * matb[1] + mata[9] * matb[2] + mata[13] * matb[3],
                mata[2] * matb[0] + mata[6] * matb[1] + mata[10] * matb[2] + mata[14] * matb[3],
                mata[3] * matb[0] + mata[7] * matb[1] + mata[11] * matb[2] + mata[15] * matb[3],

                mata[0] * matb[4] + mata[4] * matb[5] + mata[8] * matb[6] + mata[12] * matb[7],
                mata[1] * matb[4] + mata[5] * matb[5] + mata[9] * matb[6] + mata[13] * matb[7],
                mata[2] * matb[4] + mata[6] * matb[5] + mata[10] * matb[6] + mata[14] * matb[7],
                mata[3] * matb[4] + mata[7] * matb[5] + mata[11] * matb[6] + mata[15] * matb[7],

                mata[0] * matb[8] + mata[4] * matb[9] + mata[8] * matb[10] + mata[12] * matb[11],
                mata[1] * matb[8] + mata[5] * matb[9] + mata[9] * matb[10] + mata[13] * matb[11],
                mata[2] * matb[8] + mata[6] * matb[9] + mata[10] * matb[10] + mata[14] * matb[11],
                mata[3] * matb[8] + mata[7] * matb[9] + mata[11] * matb[10] + mata[15] * matb[11],

                mata[0] * matb[12] + mata[4] * matb[13] + mata[8] * matb[14] + mata[12] * matb[15],                
                mata[1] * matb[12] + mata[5] * matb[13] + mata[9] * matb[14] + mata[13] * matb[15],
                mata[2] * matb[12] + mata[6] * matb[13] + mata[10] * matb[14] + mata[14] * matb[15],    
                mata[3] * matb[12] + mata[7] * matb[13] + mata[11] * matb[14] + mata[15] * matb[15]
                )
        return result;
    }

    MatrixMulDir(mat4,dir)
    {
        var result =[mat4[0] * dir[0] + mat4[4] * dir[1] + mat4[8] * dir[2] + mat4[12] * dir[3] ,
                     mat4[1] * dir[0] + mat4[5] * dir[1] + mat4[9] * dir[2] + mat4[13] * dir[3] ,
                     mat4[2] * dir[0] + mat4[6] * dir[1] + mat4[10] * dir[2] + mat4[14] * dir[3] ,
                     mat4[3] * dir[0] + mat4[7] * dir[1] + mat4[11] * dir[2] + mat4[15] * dir[3] ];
        return result;
    }

    DirMinusDir(dir1,dir2)
    {
        var dir = [dir1[0] - dir2[0],
                    dir1[1]-dir2[1],
                    dir1[2]-dir2[2]];
        return dir;
    }

    DirCrossDir(dir1,dir2)
    {
        var dir = [dir1[1] * dir2[2] - dir1[2] * dir2[1],
                   dir1[2] * dir2[0] - dir1[0] * dir2[2],
                   dir1[0] * dir2[1] - dir1[1] * dir2[0]]
        return this.DirNormalize(dir);
    }

    DirNormalize(dir)
    {
        var length = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
        var normalizedDir = [dir[0] / length, dir[1] / length, dir[2] / length]
        return normalizedDir;
    }
}
