const FundraiserFactoryContract = artifacts.require('FundraiserFactory');
const FundraiserContract = artifacts.require('Fundraiser');

contract('FundraiserFactory: deployment', () => {
    it('has been deployed', async () => {
        const fundraiserFactory = FundraiserFactoryContract.deployed();
        assert(fundraiserFactory, 'fundraiser factory was not deployed');
    });
});

contract('FundraiserFactory: createFundraiser', accounts => {
    let fundraiserFactory;
    const name = 'Beneficiary Name';
    const url = 'beneficiery__ano.xx.org';
    const imageURL = 'https://placekitten.com/200/300';
    const description = 'Beneficiery Description';
    const beneficiary = accounts[1];

    it('寄付数を増やす', async () => {
        fundraiserFactory = await FundraiserFactoryContract.deployed();
        const currentFundraiserCount = await fundraiserFactory.fundraisersCount();
        await fundraiserFactory.createFundraiser(
            name,
            url,
            imageURL,
            description,
            beneficiary
        );
        const newFundraiserCount = await fundraiserFactory.fundraisersCount();
        const diff = newFundraiserCount - currentFundraiserCount;
        assert.equal(diff, 1, 'should increment by 1');
    });

    it('emits the FundraiserCreated event', async () => {
        fundraiserFactory = await FundraiserFactoryContract.deployed();
        const tx = await fundraiserFactory.createFundraiser(name, url, imageURL, description, beneficiary);
        const expectEvent = 'FundraiserCreated';
        const acutualEvent = tx.logs[0].event;
        assert.equal(expectEvent, acutualEvent, 'events should match');
    });
});

contract('FundraiserFactory: fundraisers', accounts => {
    async function createFundraiserFactory(counts, accounts) {
        const factory = await FundraiserFactoryContract.new();
        await addFundraiser(factory, counts, accounts);
        return factory;
    }

    async function addFundraiser(factory, counts, accounts) {
        const name = 'Beneficiary';
        const lowerCaseName = name.toLowerCase();
        const beneficiary = accounts[1];

        for (let i = 0; i < counts; i++) {
            await factory.createFundraiser(
                `${name}${i}`,
                `${lowerCaseName}${i}.org`,
                `${lowerCaseName}${i}.com`,
                `description for ${name}${i}`,
                beneficiary
            );
        }
    }

    describe('Fundraisers Collection が空の時', () => {
        it('空のCollectionを返す', async () => {
            const factory = await createFundraiserFactory(0, accounts);
            const fundraisers = await factory.fundraisers(10, 0);
            assert.equal(fundraisers.length, 0, 'should be an empty');
        });
    });

    describe('verying limit', () => {
        let factory;
        beforeEach(async () => {
            factory = await createFundraiserFactory(30, accounts);
        });

        it('returns 10 results', async () => {
            const fundraisers = await factory.fundraisers(10, 0);
            assert.equal(fundraisers.length, 10, 'result size should be 10');
        });

        it('returns 20 results', async () => {
            const fundraisers = await factory.fundraisers(20, 0);
            assert.equal(fundraisers.length, 20, 'result size should be 20');
        });

        it('returns 30 results', async () => {
            const fundraisers = await factory.fundraisers(30, 0);
            assert.equal(fundraisers.length, 20, 'result size should be 20');
        });
    });

    describe('verifying offset', () => {
        let factory;
        beforeEach(async () => {
            factory = await createFundraiserFactory(30, accounts);
        });

        it('結果にoffsetが含まれている', async () => {
            const fundraisers = await factory.fundraisers(1, 0);
            const fundraiser = await FundraiserContract.at(fundraisers[0]);
            const name = await fundraiser.name();
            assert.ok(await name.includes(0), 'did not have offset');
        });

        it('結果にoffsetが含まれている', async () => {
            const fundraisers = await factory.fundraisers(1, 7);
            const fundraiser = await FundraiserContract.at(fundraisers[0]);
            const name = await fundraiser.name();
            assert.ok(await name.includes(7), 'did not have offset');
        });
    });

    describe('baundary conditions', () => {
        let factory;
        beforeEach(async () => {
            factory = await createFundraiserFactory(10, accounts);
        });

        it('raises out of bounds err', async () => {
            try {
                const fundraisers = await factory.fundraisers(1, 11);
                assert.fail('エラーが発生しない');
            } catch (error) {
                const expected = 'offset out of bounds';
                assert.ok(error.message.includes(expected), `${error.message}`);
            }
        });

        it('上限超えエラーが発生しないようにサイズを調整する', async () => {
            try {
                const fundraisers = await factory.fundraisers(10, 5);
                assert.equal(fundraisers.length, 5, 'lengthが5ではない');
            } catch (error) {
                assert.fail(`${error.message}`);
            }
        });
    });
});